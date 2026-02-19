import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

// ==================== GET — Single category with all fields ====================

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { products: true } },
        addonTemplates: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('GET /api/admin/categories/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// ==================== PUT — Update category ====================

const addonTemplateOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  price: z.number().default(0),
  image: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

const addonTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(['CHECKBOX', 'RADIO', 'SELECT', 'TEXT_INPUT', 'TEXTAREA', 'FILE_UPLOAD']),
  required: z.boolean().default(false),
  maxLength: z.number().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  acceptedFileTypes: z.array(z.string()).default([]),
  maxFileSizeMb: z.number().nullable().default(5),
  sortOrder: z.number().default(0),
  options: z.array(addonTemplateOptionSchema).default([]),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  image: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  // SEO
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  metaKeywords: z.array(z.string()).optional(),
  ogImage: z.string().nullable().optional(),
  // Addon templates
  addonTemplates: z.array(addonTemplateSchema).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const existing = await prisma.category.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check slug uniqueness if changing slug
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({ where: { slug: data.slug } })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: `Slug "${data.slug}" is already in use` },
          { status: 400 }
        )
      }
    }

    let groupsUpdated = 0

    await prisma.$transaction(async (tx) => {
      // Update category fields
      const categoryUpdate: Record<string, unknown> = {}
      if (data.name !== undefined) categoryUpdate.name = data.name
      if (data.slug !== undefined) categoryUpdate.slug = data.slug
      if (data.description !== undefined) categoryUpdate.description = data.description
      if (data.image !== undefined) categoryUpdate.image = data.image
      if (data.parentId !== undefined) categoryUpdate.parentId = data.parentId
      if (data.sortOrder !== undefined) categoryUpdate.sortOrder = data.sortOrder
      if (data.isActive !== undefined) categoryUpdate.isActive = data.isActive
      if (data.metaTitle !== undefined) categoryUpdate.metaTitle = data.metaTitle
      if (data.metaDescription !== undefined) categoryUpdate.metaDescription = data.metaDescription
      if (data.metaKeywords !== undefined) categoryUpdate.metaKeywords = data.metaKeywords
      if (data.ogImage !== undefined) categoryUpdate.ogImage = data.ogImage

      if (Object.keys(categoryUpdate).length > 0) {
        await tx.category.update({
          where: { id: params.id },
          data: categoryUpdate,
        })
      }

      // Handle addon templates — delete removed, upsert existing
      if (data.addonTemplates !== undefined) {
        const incomingIds = data.addonTemplates.filter((t) => t.id).map((t) => t.id!)

        // Delete templates that are no longer in the list
        await tx.categoryAddonTemplate.deleteMany({
          where: {
            categoryId: params.id,
            ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
          },
        })

        for (const template of data.addonTemplates) {
          if (template.id) {
            // Update existing template
            await tx.categoryAddonTemplate.update({
              where: { id: template.id },
              data: {
                name: template.name,
                description: template.description ?? null,
                type: template.type,
                required: template.required,
                maxLength: template.maxLength ?? null,
                placeholder: template.placeholder ?? null,
                acceptedFileTypes: template.acceptedFileTypes,
                maxFileSizeMb: template.maxFileSizeMb ?? 5,
                sortOrder: template.sortOrder,
              },
            })

            // Replace options: delete all existing, insert fresh
            await tx.categoryAddonTemplateOption.deleteMany({
              where: { templateId: template.id },
            })
            for (const opt of template.options) {
              await tx.categoryAddonTemplateOption.create({
                data: {
                  templateId: template.id,
                  label: opt.label,
                  price: opt.price,
                  image: opt.image ?? null,
                  isDefault: opt.isDefault,
                  sortOrder: opt.sortOrder,
                },
              })
            }

            // Propagate to linked product addon groups (non-overridden)
            const linkedGroups = await tx.productAddonGroup.findMany({
              where: {
                templateGroupId: template.id,
                isOverridden: false,
              },
            })

            for (const group of linkedGroups) {
              await tx.productAddonGroup.update({
                where: { id: group.id },
                data: {
                  name: template.name,
                  description: template.description ?? null,
                  type: template.type,
                  required: template.required,
                  maxLength: template.maxLength ?? null,
                  placeholder: template.placeholder ?? null,
                  acceptedFileTypes: template.acceptedFileTypes,
                  maxFileSizeMb: template.maxFileSizeMb ?? 5,
                },
              })

              // Replace product addon options with fresh from template
              await tx.productAddonOption.deleteMany({
                where: { groupId: group.id },
              })
              for (const opt of template.options) {
                await tx.productAddonOption.create({
                  data: {
                    groupId: group.id,
                    label: opt.label,
                    price: opt.price,
                    image: opt.image ?? null,
                    isDefault: opt.isDefault,
                    sortOrder: opt.sortOrder,
                  },
                })
              }
              groupsUpdated++
            }
          } else {
            // Create new template
            const created = await tx.categoryAddonTemplate.create({
              data: {
                categoryId: params.id,
                name: template.name,
                description: template.description ?? null,
                type: template.type,
                required: template.required,
                maxLength: template.maxLength ?? null,
                placeholder: template.placeholder ?? null,
                acceptedFileTypes: template.acceptedFileTypes,
                maxFileSizeMb: template.maxFileSizeMb ?? 5,
                sortOrder: template.sortOrder,
              },
            })
            for (const opt of template.options) {
              await tx.categoryAddonTemplateOption.create({
                data: {
                  templateId: created.id,
                  label: opt.label,
                  price: opt.price,
                  image: opt.image ?? null,
                  isDefault: opt.isDefault,
                  sortOrder: opt.sortOrder,
                },
              })
            }
          }
        }
      }
    }, { timeout: 30000 })

    // Fetch updated category
    const updated = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { products: true } },
        addonTemplates: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        category: updated,
        propagated: { groupsUpdated },
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/categories/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update category'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ==================== DELETE — Soft delete (set isActive = false) ====================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const existing = await prisma.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete — ${existing._count.products} active product${existing._count.products !== 1 ? 's' : ''} in this category.`,
        },
        { status: 400 }
      )
    }

    await prisma.category.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { id: params.id } })
  } catch (error) {
    console.error('DELETE /api/admin/categories/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
