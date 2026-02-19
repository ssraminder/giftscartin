import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

// ==================== GET — List all categories with tree structure ====================

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
        addonTemplates: {
          where: { isActive: true },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Build tree in-memory: nest children under parents
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
      createdAt: Date
      _count: { products: number }
      addonTemplates: Array<{
        id: string
        categoryId: string
        name: string
        description: string | null
        type: string
        required: boolean
        maxLength: number | null
        placeholder: string | null
        acceptedFileTypes: string[]
        maxFileSizeMb: number | null
        sortOrder: number
        isActive: boolean
        createdAt: Date
        updatedAt: Date
        options: Array<{
          id: string
          templateId: string
          label: string
          price: unknown
          image: string | null
          isDefault: boolean
          sortOrder: number
          isActive: boolean
        }>
      }>
      children: CategoryNode[]
    }

    const nodeMap = new Map<string, CategoryNode>()
    const roots: CategoryNode[] = []

    // Create nodes
    for (const cat of categories) {
      nodeMap.set(cat.id, {
        ...cat,
        children: [],
      })
    }

    // Build tree
    for (const cat of categories) {
      const node = nodeMap.get(cat.id)!
      if (cat.parentId && nodeMap.has(cat.parentId)) {
        nodeMap.get(cat.parentId)!.children.push(node)
      } else {
        // Root-level (either no parent or orphaned — parent not found)
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
  // SEO
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  metaKeywords: z.array(z.string()).default([]),
  ogImage: z.string().nullable().optional(),
  // Addon templates
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
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

    // Check slug uniqueness
    const existingSlug = await prisma.category.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `Slug "${slug}" is already in use` },
        { status: 400 }
      )
    }

    // Sequential queries (no interactive transaction — pgbouncer compatible)

    const category = await prisma.category.create({
      data: {
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
      },
    })

    // Create addon templates and their options
    for (const template of data.addonTemplates) {
      const createdTemplate = await prisma.categoryAddonTemplate.create({
        data: {
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
        },
      })
      for (const opt of template.options) {
        await prisma.categoryAddonTemplateOption.create({
          data: {
            templateId: createdTemplate.id,
            label: opt.label,
            price: opt.price,
            image: opt.image ?? null,
            isDefault: opt.isDefault,
            sortOrder: opt.sortOrder,
          },
        })
      }
    }

    // Fetch full category with relations
    const full = await prisma.category.findUnique({
      where: { id: category.id },
      include: {
        _count: { select: { products: true } },
        addonTemplates: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

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
