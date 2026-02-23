import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

// ==================== Types ====================

interface MenuTreeNode {
  id: string
  label: string
  slug: string | null
  href: string | null
  icon: string | null
  isVisible: boolean
  itemType: string
  sortOrder: number
  children: MenuTreeNode[]
}

// ==================== GET — Public menu tree ====================

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('sortOrder', { ascending: true })

    if (error) throw error

    // Build tree in-memory
    const nodeMap = new Map<string, MenuTreeNode>()
    const roots: MenuTreeNode[] = []

    // First pass: create all nodes
    for (const item of items || []) {
      nodeMap.set(item.id, {
        id: item.id,
        label: item.label,
        slug: item.slug,
        href: item.href,
        icon: item.icon,
        isVisible: item.isVisible,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        children: [],
      })
    }

    // Second pass: build tree
    for (const item of items || []) {
      const node = nodeMap.get(item.id)!
      if (item.parentId && nodeMap.has(item.parentId)) {
        nodeMap.get(item.parentId)!.children.push(node)
      } else if (!item.parentId) {
        roots.push(node)
      }
    }

    return NextResponse.json(
      { success: true, data: { items: roots } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Menu GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}

// ==================== PATCH — Update menu items (admin only) ====================
// Accepts either:
//   { updates: [{ id, ...fields }] }  — bulk format
//   { id, ...fields }                  — single item shorthand

const patchItemSchema = z.object({
  id: z.string(),
  isVisible: z.boolean().optional(),
  label: z.string().min(1).optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  slug: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

const patchBulkSchema = z.object({
  updates: z.array(patchItemSchema).min(1).max(100),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.role || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Support both single { id, ...fields } and bulk { updates: [...] }
    let updates: z.infer<typeof patchItemSchema>[]
    if (body.updates) {
      const parsed = patchBulkSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        )
      }
      updates = parsed.data.updates
    } else if (body.id) {
      const parsed = patchItemSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        )
      }
      updates = [parsed.data]
    } else {
      return NextResponse.json(
        { success: false, error: 'Must provide either { id, ...fields } or { updates: [...] }' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Run all updates with Promise.all (no transaction — pgBouncer compatible)
    await Promise.all(
      updates.map((update) => {
        const { id, ...data } = update
        return supabase
          .from('menu_items')
          .update({ ...data, updatedAt: new Date().toISOString() })
          .eq('id', id)
      })
    )

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error) {
    console.error('Menu PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update menu items' },
      { status: 500 }
    )
  }
}

// ==================== POST — Create new menu item (admin only) ====================

const createSchema = z.object({
  parentId: z.string().optional(),
  label: z.string().min(1),
  slug: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  itemType: z.string().default('link'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.role || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { parentId, label, slug, href, icon, isVisible, sortOrder, itemType } = parsed.data

    const supabase = getSupabaseAdmin()

    // Determine sort order if not provided — append to end
    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined) {
      let query = supabase
        .from('menu_items')
        .select('sortOrder')
        .order('sortOrder', { ascending: false })
        .limit(1)

      if (parentId) {
        query = query.eq('parentId', parentId)
      } else {
        query = query.is('parentId', null)
      }

      const { data: lastSibling } = await query.maybeSingle()
      finalSortOrder = (lastSibling?.sortOrder ?? 0) + 1
    }

    const { data: newItem, error } = await supabase
      .from('menu_items')
      .insert({
        parentId: parentId ?? null,
        label,
        slug: slug ?? null,
        href: href ?? null,
        icon: icon ?? null,
        isVisible: isVisible ?? true,
        sortOrder: finalSortOrder,
        itemType,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: newItem }, { status: 201 })
  } catch (error) {
    console.error('Menu POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create menu item' },
      { status: 500 }
    )
  }
}

// ==================== DELETE — Delete menu item (admin only) ====================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.role || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Menu DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}
