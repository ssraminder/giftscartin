import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

// ==================== GET — Single category with all fields ====================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    const { data: category } = await supabase
      .from('categories')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    const [
      { count: productCount },
      { data: templates },
      { data: parent },
      { data: children },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('categoryId', params.id),
      supabase.from('category_addon_templates').select('*, category_addon_template_options(*)').eq('categoryId', params.id).order('sortOrder', { ascending: true }),
      category.parentId
        ? supabase.from('categories').select('id, name, slug').eq('id', category.parentId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('categories').select('id, name, slug, isActive').eq('parentId', params.id).order('sortOrder', { ascending: true }),
    ])

    const result = {
      ...category,
      _count: { products: productCount ?? 0 },
      addonTemplates: (templates || []).map((t: Record<string, unknown>) => ({
        ...t,
        options: ((t.category_addon_template_options as Record<string, unknown>[]) || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
      })),
      parent: parent,
      children: children || [],
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/admin/categories/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch category' }, { status: 500 })
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
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  metaKeywords: z.array(z.string()).optional(),
  ogImage: z.string().nullable().optional(),
  addonTemplates: z.array(addonTemplateSchema).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('categories')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data

    // Check slug uniqueness if changing slug
    if (data.slug && data.slug !== existing.slug) {
      const { data: slugExists } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', data.slug)
        .maybeSingle()
      if (slugExists) {
        return NextResponse.json({ success: false, error: `Slug "${data.slug}" is already in use` }, { status: 400 })
      }
    }

    let groupsUpdated = 0

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
      await supabase.from('categories').update(categoryUpdate).eq('id', params.id)
    }

    // Handle addon templates
    if (data.addonTemplates !== undefined) {
      const incomingIds = data.addonTemplates.filter((t) => t.id).map((t) => t.id!)

      // Delete templates not in list
      if (incomingIds.length > 0) {
        const { data: toDelete } = await supabase
          .from('category_addon_templates')
          .select('id')
          .eq('categoryId', params.id)
          .not('id', 'in', `(${incomingIds.join(',')})`)
        if (toDelete && toDelete.length > 0) {
          await supabase.from('category_addon_templates').delete().in('id', toDelete.map(t => t.id))
        }
      } else {
        await supabase.from('category_addon_templates').delete().eq('categoryId', params.id)
      }

      for (const template of data.addonTemplates) {
        if (template.id) {
          // Update existing template
          await supabase.from('category_addon_templates').update({
            name: template.name,
            description: template.description ?? null,
            type: template.type,
            required: template.required,
            maxLength: template.maxLength ?? null,
            placeholder: template.placeholder ?? null,
            acceptedFileTypes: template.acceptedFileTypes,
            maxFileSizeMb: template.maxFileSizeMb ?? 5,
            sortOrder: template.sortOrder,
            updatedAt: new Date().toISOString(),
          }).eq('id', template.id)

          // Replace options
          await supabase.from('category_addon_template_options').delete().eq('templateId', template.id)
          for (const opt of template.options) {
            await supabase.from('category_addon_template_options').insert({
              templateId: template.id,
              label: opt.label,
              price: opt.price,
              image: opt.image ?? null,
              isDefault: opt.isDefault,
              sortOrder: opt.sortOrder,
            })
          }

          // Propagate to linked product addon groups (non-overridden)
          const { data: linkedGroups } = await supabase
            .from('product_addon_groups')
            .select('id')
            .eq('templateGroupId', template.id)
            .eq('isOverridden', false)

          for (const group of (linkedGroups || [])) {
            await supabase.from('product_addon_groups').update({
              name: template.name,
              description: template.description ?? null,
              type: template.type,
              required: template.required,
              maxLength: template.maxLength ?? null,
              placeholder: template.placeholder ?? null,
              acceptedFileTypes: template.acceptedFileTypes,
              maxFileSizeMb: template.maxFileSizeMb ?? 5,
              updatedAt: new Date().toISOString(),
            }).eq('id', group.id)

            await supabase.from('product_addon_options').delete().eq('groupId', group.id)
            for (const opt of template.options) {
              await supabase.from('product_addon_options').insert({
                groupId: group.id,
                label: opt.label,
                price: opt.price,
                image: opt.image ?? null,
                isDefault: opt.isDefault,
                sortOrder: opt.sortOrder,
              })
            }
            groupsUpdated++
          }
        } else {
          // Create new template
          const { data: created } = await supabase
            .from('category_addon_templates')
            .insert({
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
            })
            .select()
            .single()

          if (created) {
            for (const opt of template.options) {
              await supabase.from('category_addon_template_options').insert({
                templateId: created.id,
                label: opt.label,
                price: opt.price,
                image: opt.image ?? null,
                isDefault: opt.isDefault,
                sortOrder: opt.sortOrder,
              })
            }
          }
        }
      }
    }

    // Fetch updated category
    const { data: updatedCat } = await supabase.from('categories').select('*').eq('id', params.id).single()
    const { data: updatedTemplates } = await supabase
      .from('category_addon_templates')
      .select('*, category_addon_template_options(*)')
      .eq('categoryId', params.id)
      .order('sortOrder', { ascending: true })
    const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('categoryId', params.id)

    return NextResponse.json({
      success: true,
      data: {
        category: {
          ...updatedCat,
          _count: { products: pCount ?? 0 },
          addonTemplates: (updatedTemplates || []).map((t: Record<string, unknown>) => ({
            ...t,
            options: ((t.category_addon_template_options as Record<string, unknown>[]) || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
          })),
        },
        propagated: { groupsUpdated },
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/categories/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update category'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ==================== DELETE — Soft delete ====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    const { count: activeProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('categoryId', params.id)
      .eq('isActive', true)

    if ((activeProducts ?? 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete — ${activeProducts} active product${activeProducts !== 1 ? 's' : ''} in this category.`,
        },
        { status: 400 }
      )
    }

    await supabase.from('categories').update({ isActive: false }).eq('id', params.id)

    return NextResponse.json({ success: true, data: { id: params.id } })
  } catch (error) {
    console.error('DELETE /api/admin/categories/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 })
  }
}
