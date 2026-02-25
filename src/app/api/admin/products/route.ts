import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { autoAssignProductToVendors } from '@/lib/auto-assign-vendor-products'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

// ==================== GET — List products with filters ====================

const listSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  categorySlug: z.string().optional(),
  type: z.enum(['SIMPLE', 'VARIABLE']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = listSchema.parse(Object.fromEntries(searchParams))
    const { search, category, categorySlug, type, status, isActive, page, pageSize } = params

    const supabase = getSupabaseAdmin()

    // If filtering by categorySlug, resolve to categoryId first
    let categoryIdFilter: string | undefined = category
    if (categorySlug && !categoryIdFilter) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()
      if (cat) categoryIdFilter = cat.id
    }

    // Build query
    let query = supabase
      .from('products')
      .select('id, name, slug, productType, basePrice, isActive, images, categoryId, categories!inner(id, name, slug)', { count: 'exact' })
      .order('createdAt', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (categoryIdFilter) {
      query = query.eq('categoryId', categoryIdFilter)
    }
    if (type) {
      query = query.eq('productType', type)
    }
    if (status === 'active' || isActive === 'true') {
      query = query.eq('isActive', true)
    } else if (status === 'inactive' || isActive === 'false') {
      query = query.eq('isActive', false)
    }

    const skip = (page - 1) * pageSize
    query = query.range(skip, skip + pageSize - 1)

    const { data: items, count: total, error } = await query

    if (error) throw error

    // Get vendor product counts and variation counts for these products
    const productIds = (items || []).map(i => i.id)
    const vpCounts: Record<string, number> = {}
    const varCounts: Record<string, number> = {}
    if (productIds.length > 0) {
      const { data: vpRows } = await supabase
        .from('vendor_products')
        .select('productId')
        .in('productId', productIds)
      if (vpRows) {
        for (const row of vpRows) {
          vpCounts[row.productId] = (vpCounts[row.productId] || 0) + 1
        }
      }

      const { data: varRows } = await supabase
        .from('product_variations')
        .select('productId')
        .in('productId', productIds)
      if (varRows) {
        for (const row of varRows) {
          varCounts[row.productId] = (varCounts[row.productId] || 0) + 1
        }
      }
    }

    const data = (items || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      productType: item.productType,
      basePrice: Number(item.basePrice),
      isActive: item.isActive,
      images: item.images,
      category: item.categories,
      _count: {
        vendorProducts: vpCounts[item.id as string] || 0,
        variations: varCounts[item.id as string] || 0,
      },
    }))

    return NextResponse.json({
      success: true,
      data: { items: data, total: total ?? 0, page, pageSize },
    })
  } catch (error) {
    console.error('GET /api/admin/products error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// ==================== POST — Create product ====================

const addonOptionSchema = z.object({
  label: z.string().min(1),
  price: z.number().default(0),
  image: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

const addonGroupSchema = z.object({
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
  value: z.string().min(1),
  sortOrder: z.number().default(0),
})

const attributeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  isForVariations: z.boolean().default(true),
  sortOrder: z.number().default(0),
  options: z.array(attributeOptionSchema).default([]),
})

const variationSchema = z.object({
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

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  shortDesc: z.string().nullable().optional(),
  categoryId: z.string().min(1),
  productType: z.enum(['SIMPLE', 'VARIABLE']).default('SIMPLE'),
  basePrice: z.number().min(0.01, 'Base price must be greater than 0'),
  salePrice: z.number().nullable().optional(),
  saleFrom: z.string().nullable().optional(),
  saleTo: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  occasion: z.array(z.string()).default([]),
  weight: z.string().nullable().optional(),
  isVeg: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isSameDayEligible: z.boolean().default(false),
  sku: z.string().nullable().optional(),
  stockQty: z.number().int().nullable().optional(),
  dailyLimit: z.number().int().nullable().optional(),
  sortOrder: z.number().default(0),
  // SEO
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.array(z.string()).default([]),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  // Nested
  attributes: z.array(attributeSchema).default([]),
  variations: z.array(variationSchema).default([]),
  addonGroups: z.array(addonGroupSchema).default([]),
  upsellIds: z.array(z.string()).default([]),
})

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
    const parsed = createProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = getSupabaseAdmin()

    // Auto-generate slug if not provided
    let slug = data.slug
    if (!slug) {
      slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }

    // Ensure slug is unique
    let finalSlug = slug
    let suffix = 2
    while (true) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      if (!existing) break
      finalSlug = `${slug}-${suffix}`
      suffix++
    }

    // Create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: data.name,
        slug: finalSlug,
        description: data.description ?? null,
        shortDesc: data.shortDesc ?? null,
        categoryId: data.categoryId,
        productType: data.productType,
        basePrice: data.basePrice,
        images: data.images,
        tags: data.tags,
        occasion: data.occasion,
        weight: data.weight ?? null,
        isVeg: data.isVeg,
        isActive: data.isActive,
        isSameDayEligible: data.isSameDayEligible,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords,
        ogImage: data.ogImage ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
      })
      .select()
      .single()

    if (productError) throw productError

    // Create attributes and their options
    for (const attr of data.attributes) {
      const { data: createdAttr, error: attrError } = await supabase
        .from('product_attributes')
        .insert({
          productId: product.id,
          name: attr.name,
          slug: attr.slug,
          isForVariations: attr.isForVariations,
          sortOrder: attr.sortOrder,
        })
        .select()
        .single()

      if (attrError) throw attrError

      for (const opt of attr.options) {
        await supabase.from('product_attribute_options').insert({
          attributeId: createdAttr.id,
          value: opt.value,
          sortOrder: opt.sortOrder,
        })
      }
    }

    // Create variations
    for (const v of data.variations) {
      await supabase.from('product_variations').insert({
        productId: product.id,
        attributes: v.attributes,
        price: v.price,
        salePrice: v.salePrice ?? null,
        saleFrom: v.saleFrom ? new Date(v.saleFrom).toISOString() : null,
        saleTo: v.saleTo ? new Date(v.saleTo).toISOString() : null,
        sku: v.sku ?? null,
        stockQty: v.stockQty ?? null,
        image: v.image ?? null,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      })
    }

    // Create addon groups and their options
    for (const group of data.addonGroups) {
      const { data: createdGroup, error: groupError } = await supabase
        .from('product_addon_groups')
        .insert({
          productId: product.id,
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
        })
        .select()
        .single()

      if (groupError) throw groupError

      for (const opt of group.options) {
        await supabase.from('product_addon_options').insert({
          groupId: createdGroup.id,
          label: opt.label,
          price: opt.price,
          image: opt.image ?? null,
          isDefault: opt.isDefault,
          sortOrder: opt.sortOrder,
        })
      }
    }

    // Create upsells
    for (let i = 0; i < data.upsellIds.length; i++) {
      await supabase.from('product_upsells').insert({
        productId: product.id,
        upsellProductId: data.upsellIds[i],
        sortOrder: i,
      })
    }

    // Auto-assign this product to all vendors whose categories match
    if (data.isActive) {
      const assignResult = await autoAssignProductToVendors(product.id, data.categoryId)
      console.log(
        `[product-create] Auto-assigned product ${product.id} to ${assignResult.attempted} vendors` +
        (assignResult.error ? `, error: ${assignResult.error}` : '')
      )
    }

    // Fetch the full product with relations
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, categories(*)')
      .eq('id', product.id)
      .single()

    const { data: attrs } = await supabase
      .from('product_attributes')
      .select('*, product_attribute_options(*)')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true })

    const { data: variations } = await supabase
      .from('product_variations')
      .select('*')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true })

    const { data: addonGroups } = await supabase
      .from('product_addon_groups')
      .select('*, product_addon_options(*)')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true })

    const { data: upsells } = await supabase
      .from('product_upsells')
      .select('*, products!product_upsells_upsellProductId_fkey(id, name, slug, images, basePrice)')
      .eq('productId', product.id)

    const full = {
      ...fullProduct,
      category: fullProduct?.categories,
      attributes: (attrs || []).map((a: Record<string, unknown>) => ({
        ...a,
        options: a.product_attribute_options || [],
      })),
      variations: variations || [],
      addonGroups: (addonGroups || []).map((g: Record<string, unknown>) => ({
        ...g,
        options: g.product_addon_options || [],
      })),
      upsells: (upsells || []).map((u: Record<string, unknown>) => ({
        ...u,
        upsellProduct: u.products,
      })),
    }

    return NextResponse.json({ success: true, data: full }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/products error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create product'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
