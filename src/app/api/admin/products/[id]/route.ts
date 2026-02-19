import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

// ==================== GET — Single product with all relations ====================

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

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        attributes: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        variations: { orderBy: { sortOrder: 'asc' } },
        addonGroups: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        upsells: {
          include: {
            upsellProduct: {
              select: { id: true, name: true, slug: true, images: true, basePrice: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        vendorProducts: {
          include: { vendor: { select: { id: true, businessName: true } } },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('GET /api/admin/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// ==================== PUT — Update product ====================

const addonOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  price: z.number().default(0),
  image: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

const addonGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(['CHECKBOX', 'RADIO', 'SELECT', 'TEXT_INPUT', 'TEXTAREA', 'FILE_UPLOAD']),
  required: z.boolean().default(false),
  maxLength: z.number().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  acceptedFileTypes: z.array(z.string()).default([]),
  maxFileSizeMb: z.number().nullable().default(5),
  templateGroupId: z.string().nullable().optional(),
  isOverridden: z.boolean().default(false),
  sortOrder: z.number().default(0),
  options: z.array(addonOptionSchema).default([]),
})

const attributeOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1),
  sortOrder: z.number().default(0),
})

const attributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  isForVariations: z.boolean().default(true),
  sortOrder: z.number().default(0),
  options: z.array(attributeOptionSchema).default([]),
})

const variationSchema = z.object({
  id: z.string().optional(),
  attributes: z.record(z.string(), z.string()),
  price: z.number().min(0),
  salePrice: z.number().nullable().optional(),
  saleFrom: z.string().nullable().optional(),
  saleTo: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  stockQty: z.number().int().nullable().optional(),
  image: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  shortDesc: z.string().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  productType: z.enum(['SIMPLE', 'VARIABLE']).optional(),
  basePrice: z.number().min(0).optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  occasion: z.array(z.string()).optional(),
  weight: z.string().nullable().optional(),
  isVeg: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // SEO
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.array(z.string()).optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  // Nested
  attributes: z.array(attributeSchema).optional(),
  variations: z.array(variationSchema).optional(),
  addonGroups: z.array(addonGroupSchema).optional(),
  upsellIds: z.array(z.string()).optional(),
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

    const existing = await prisma.product.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Sequential queries (no interactive transaction — pgbouncer compatible)

    // Update product fields
    const productUpdate: Record<string, unknown> = {}
    if (data.name !== undefined) productUpdate.name = data.name
    if (data.slug !== undefined) productUpdate.slug = data.slug
    if (data.description !== undefined) productUpdate.description = data.description
    if (data.shortDesc !== undefined) productUpdate.shortDesc = data.shortDesc
    if (data.categoryId !== undefined) productUpdate.categoryId = data.categoryId
    if (data.productType !== undefined) productUpdate.productType = data.productType
    if (data.basePrice !== undefined) productUpdate.basePrice = data.basePrice
    if (data.images !== undefined) productUpdate.images = data.images
    if (data.tags !== undefined) productUpdate.tags = data.tags
    if (data.occasion !== undefined) productUpdate.occasion = data.occasion
    if (data.weight !== undefined) productUpdate.weight = data.weight
    if (data.isVeg !== undefined) productUpdate.isVeg = data.isVeg
    if (data.isActive !== undefined) productUpdate.isActive = data.isActive
    if (data.metaTitle !== undefined) productUpdate.metaTitle = data.metaTitle
    if (data.metaDescription !== undefined) productUpdate.metaDescription = data.metaDescription
    if (data.metaKeywords !== undefined) productUpdate.metaKeywords = data.metaKeywords
    if (data.ogImage !== undefined) productUpdate.ogImage = data.ogImage
    if (data.canonicalUrl !== undefined) productUpdate.canonicalUrl = data.canonicalUrl

    if (Object.keys(productUpdate).length > 0) {
      await prisma.product.update({
        where: { id: params.id },
        data: productUpdate,
      })
    }

    // Handle attributes — delete removed, upsert existing
    if (data.attributes !== undefined) {
      const incomingIds = data.attributes.filter((a) => a.id).map((a) => a.id!)
      // Delete removed attributes
      await prisma.productAttribute.deleteMany({
        where: {
          productId: params.id,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
      })

      for (const attr of data.attributes) {
        if (attr.id) {
          // Update existing
          await prisma.productAttribute.update({
            where: { id: attr.id },
            data: {
              name: attr.name,
              slug: attr.slug,
              isForVariations: attr.isForVariations,
              sortOrder: attr.sortOrder,
            },
          })
          // Handle options
          const optIds = attr.options.filter((o) => o.id).map((o) => o.id!)
          await prisma.productAttributeOption.deleteMany({
            where: {
              attributeId: attr.id,
              ...(optIds.length > 0 ? { id: { notIn: optIds } } : {}),
            },
          })
          for (const opt of attr.options) {
            if (opt.id) {
              await prisma.productAttributeOption.update({
                where: { id: opt.id },
                data: { value: opt.value, sortOrder: opt.sortOrder },
              })
            } else {
              await prisma.productAttributeOption.create({
                data: {
                  attributeId: attr.id,
                  value: opt.value,
                  sortOrder: opt.sortOrder,
                },
              })
            }
          }
        } else {
          // Create new
          const created = await prisma.productAttribute.create({
            data: {
              productId: params.id,
              name: attr.name,
              slug: attr.slug,
              isForVariations: attr.isForVariations,
              sortOrder: attr.sortOrder,
            },
          })
          for (const opt of attr.options) {
            await prisma.productAttributeOption.create({
              data: {
                attributeId: created.id,
                value: opt.value,
                sortOrder: opt.sortOrder,
              },
            })
          }
        }
      }
    }

    // Handle variations — delete removed, upsert existing
    if (data.variations !== undefined) {
      const incomingVarIds = data.variations.filter((v) => v.id).map((v) => v.id!)
      await prisma.productVariation.deleteMany({
        where: {
          productId: params.id,
          ...(incomingVarIds.length > 0 ? { id: { notIn: incomingVarIds } } : {}),
        },
      })

      for (const v of data.variations) {
        if (v.id) {
          await prisma.productVariation.update({
            where: { id: v.id },
            data: {
              attributes: v.attributes,
              price: v.price,
              salePrice: v.salePrice ?? null,
              saleFrom: v.saleFrom ? new Date(v.saleFrom) : null,
              saleTo: v.saleTo ? new Date(v.saleTo) : null,
              sku: v.sku ?? null,
              stockQty: v.stockQty ?? null,
              image: v.image ?? null,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
            },
          })
        } else {
          await prisma.productVariation.create({
            data: {
              productId: params.id,
              attributes: v.attributes,
              price: v.price,
              salePrice: v.salePrice ?? null,
              saleFrom: v.saleFrom ? new Date(v.saleFrom) : null,
              saleTo: v.saleTo ? new Date(v.saleTo) : null,
              sku: v.sku ?? null,
              stockQty: v.stockQty ?? null,
              image: v.image ?? null,
              isActive: v.isActive,
              sortOrder: v.sortOrder,
            },
          })
        }
      }
    }

    // Handle addon groups — delete removed, upsert existing
    if (data.addonGroups !== undefined) {
      const incomingGroupIds = data.addonGroups.filter((g) => g.id).map((g) => g.id!)
      await prisma.productAddonGroup.deleteMany({
        where: {
          productId: params.id,
          ...(incomingGroupIds.length > 0 ? { id: { notIn: incomingGroupIds } } : {}),
        },
      })

      for (const group of data.addonGroups) {
        if (group.id) {
          await prisma.productAddonGroup.update({
            where: { id: group.id },
            data: {
              name: group.name,
              description: group.description ?? null,
              type: group.type,
              required: group.required,
              maxLength: group.maxLength ?? null,
              placeholder: group.placeholder ?? null,
              acceptedFileTypes: group.acceptedFileTypes,
              maxFileSizeMb: group.maxFileSizeMb ?? 5,
              templateGroupId: group.templateGroupId ?? null,
              isOverridden: group.isOverridden,
              sortOrder: group.sortOrder,
            },
          })
          // Handle options
          const optIds = group.options.filter((o) => o.id).map((o) => o.id!)
          await prisma.productAddonOption.deleteMany({
            where: {
              groupId: group.id,
              ...(optIds.length > 0 ? { id: { notIn: optIds } } : {}),
            },
          })
          for (const opt of group.options) {
            if (opt.id) {
              await prisma.productAddonOption.update({
                where: { id: opt.id },
                data: {
                  label: opt.label,
                  price: opt.price,
                  image: opt.image ?? null,
                  isDefault: opt.isDefault,
                  sortOrder: opt.sortOrder,
                },
              })
            } else {
              await prisma.productAddonOption.create({
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
          }
        } else {
          // Create new group
          const created = await prisma.productAddonGroup.create({
            data: {
              productId: params.id,
              name: group.name,
              description: group.description ?? null,
              type: group.type,
              required: group.required,
              maxLength: group.maxLength ?? null,
              placeholder: group.placeholder ?? null,
              acceptedFileTypes: group.acceptedFileTypes,
              maxFileSizeMb: group.maxFileSizeMb ?? 5,
              templateGroupId: group.templateGroupId ?? null,
              isOverridden: group.isOverridden,
              sortOrder: group.sortOrder,
            },
          })
          for (const opt of group.options) {
            await prisma.productAddonOption.create({
              data: {
                groupId: created.id,
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

    // Handle upsells — replace entire list
    if (data.upsellIds !== undefined) {
      await prisma.productUpsell.deleteMany({ where: { productId: params.id } })
      for (let i = 0; i < data.upsellIds.length; i++) {
        await prisma.productUpsell.create({
          data: {
            productId: params.id,
            upsellProductId: data.upsellIds[i],
            sortOrder: i,
          },
        })
      }
    }

    // Fetch updated product
    const updated = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        attributes: { include: { options: true }, orderBy: { sortOrder: 'asc' } },
        variations: { orderBy: { sortOrder: 'asc' } },
        addonGroups: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
        upsells: {
          include: {
            upsellProduct: { select: { id: true, name: true, slug: true, images: true, basePrice: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/admin/products/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update product'
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

    const existing = await prisma.product.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { id: params.id } })
  } catch (error) {
    console.error('DELETE /api/admin/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
