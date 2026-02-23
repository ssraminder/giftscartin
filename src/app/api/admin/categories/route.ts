import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

// ==================== GET — List all categories with tree structure ====================

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('sortOrder', { ascending: true })

    if (error) throw error

    // Get product counts per category
    const catIds = (categories || []).map(c => c.id)
    const productCounts: Record<string, number> = {}
    if (catIds.length > 0) {
      const { data: productRows } = await supabase
        .from('products')
        .select('categoryId')
        .in('categoryId', catIds)
      if (productRows) {
        for (const row of productRows) {
          productCounts[row.categoryId] = (productCounts[row.categoryId] || 0) + 1
        }
      }
    }

    // Get addon templates with options
    const { data: templates } = await supabase
      .from('category_addon_templates')
      .select('*, category_addon_template_options(*)')
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })

    const templatesByCategory: Record<string, Record<string, unknown>[]> = {}
    for (const t of (templates || [])) {
      if (!templatesByCategory[t.categoryId]) templatesByCategory[t.categoryId] = []
      templatesByCategory[t.categoryId].push({
        ...t,
        options: ((t.category_addon_template_options as Record<string, unknown>[]) || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
      })
    }

    // Build tree in-memory
    interface CategoryNode {
      id: string
      name: string
      slug: string
      description: string | null
      image: string | null
      sortOrder: number
      isActive: boolean
      parentId: string | null
      metaTitle: string | null
      metaDescription: string | null
      metaKeywords: string[]
      ogImage: string | null
      createdAt: string
      _count: { products: number }
      addonTemplates: Record<string, unknown>[]
      children: CategoryNode[]
    }

    const nodeMap = new Map<string, CategoryNode>()
    const roots: CategoryNode[] = []

    for (const cat of (categories || [])) {
      nodeMap.set(cat.id, {
        ...cat,
        _count: { products: productCounts[cat.id] || 0 },
        addonTemplates: templatesByCategory[cat.id] || [],
        children: [],
      })
    }

    for (const cat of (categories || [])) {
      const node = nodeMap.get(cat.id)!
      if (cat.parentId && nodeMap.has(cat.parentId)) {
        nodeMap.get(cat.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return NextResponse.json({ success: true, data: roots })
  } catch (error) {
    console.error('GET /api/admin/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// ==================== POST — Create category ====================

const addonTemplateOptionSchema = z.object({
  label: z.string().min(1),
  price: z.number().default(0),
  image: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

const addonTemplateSchema = z.object({
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

const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  image: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  metaKeywords: z.array(z.string()).default([]),
  ogImage: z.string().nullable().optional(),
  addonTemplates: z.array(addonTemplateSchema).default([]),
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const slug = data.slug?.trim() || generateSlug(data.name)
    const supabase = getSupabaseAdmin()

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `Slug "${slug}" is already in use` },
        { status: 400 }
      )
    }

    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        name: data.name,
        slug,
        description: data.description ?? null,
        image: data.image ?? null,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords,
        ogImage: data.ogImage ?? null,
      })
      .select()
      .single()

    if (catError) throw catError

    // Create addon templates and their options
    for (const template of data.addonTemplates) {
      const { data: createdTemplate, error: tErr } = await supabase
        .from('category_addon_templates')
        .insert({
          categoryId: category.id,
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

      if (tErr) throw tErr

      for (const opt of template.options) {
        await supabase.from('category_addon_template_options').insert({
          templateId: createdTemplate.id,
          label: opt.label,
          price: opt.price,
          image: opt.image ?? null,
          isDefault: opt.isDefault,
          sortOrder: opt.sortOrder,
        })
      }
    }

    // Fetch full category with relations
    const { data: fullCat } = await supabase
      .from('categories')
      .select('*')
      .eq('id', category.id)
      .single()

    const { data: catTemplates } = await supabase
      .from('category_addon_templates')
      .select('*, category_addon_template_options(*)')
      .eq('categoryId', category.id)
      .order('sortOrder', { ascending: true })

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('categoryId', category.id)

    const full = {
      ...fullCat,
      _count: { products: productCount ?? 0 },
      addonTemplates: (catTemplates || []).map((t: Record<string, unknown>) => ({
        ...t,
        options: ((t.category_addon_template_options as Record<string, unknown>[]) || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
      })),
    }

    return NextResponse.json({ success: true, data: full }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/categories error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create category'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
