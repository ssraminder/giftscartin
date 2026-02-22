import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = listSchema.parse(Object.fromEntries(searchParams))
    const { search, category, categorySlug, type, status, isActive, page, pageSize } = params

    const where: Record<string, unknown> = {}

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    if (category) {
      where.categoryId = category
    }
    if (categorySlug) {
      where.category = { slug: categorySlug }
    }
    if (type) {
      where.productType = type
    }
    // Support both status enum and isActive boolean string
    if (status === 'active' || isActive === 'true') {
      where.isActive = true
    } else if (status === 'inactive' || isActive === 'false') {
      where.isActive = false
    }
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { vendorProducts: true, variations: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    const data = items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      productType: item.productType,
      basePrice: Number(item.basePrice),
      isActive: item.isActive,
      images: item.images,
      category: item.category,
      _count: item._count,
    }))

    return NextResponse.json({
      success: true,
      data: { items: data, total, page, pageSize },
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
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
    while (await prisma.product.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${suffix}`
      suffix++
    }

    // Sequential queries (no interactive transaction — pgbouncer compatible)

    // Create the product
    const product = await prisma.product.create({
      data: {
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
      },
    })

    // Create attributes and their options
    for (const attr of data.attributes) {
      const createdAttr = await prisma.productAttribute.create({
        data: {
          productId: product.id,
          name: attr.name,
          slug: attr.slug,
          isForVariations: attr.isForVariations,
          sortOrder: attr.sortOrder,
        },
      })
      for (const opt of attr.options) {
        await prisma.productAttributeOption.create({
          data: {
            attributeId: createdAttr.id,
            value: opt.value,
            sortOrder: opt.sortOrder,
          },
        })
      }
    }

    // Create variations
    for (const v of data.variations) {
      await prisma.productVariation.create({
        data: {
          productId: product.id,
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

    // Create addon groups and their options
    for (const group of data.addonGroups) {
      const createdGroup = await prisma.productAddonGroup.create({
        data: {
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
        },
      })
      for (const opt of group.options) {
        await prisma.productAddonOption.create({
          data: {
            groupId: createdGroup.id,
            label: opt.label,
            price: opt.price,
            image: opt.image ?? null,
            isDefault: opt.isDefault,
            sortOrder: opt.sortOrder,
          },
        })
      }
    }

    // Create upsells
    for (let i = 0; i < data.upsellIds.length; i++) {
      await prisma.productUpsell.create({
        data: {
          productId: product.id,
          upsellProductId: data.upsellIds[i],
          sortOrder: i,
        },
      })
    }

    // Fetch the full product with relations
    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        attributes: { include: { options: true }, orderBy: { sortOrder: 'asc' } },
        variations: { orderBy: { sortOrder: 'asc' } },
        addonGroups: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
        upsells: { include: { upsellProduct: { select: { id: true, name: true, slug: true, images: true, basePrice: true } } } },
      },
    })

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
