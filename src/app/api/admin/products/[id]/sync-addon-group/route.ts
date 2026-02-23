import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const syncSchema = z.object({
  addonGroupId: z.string().min(1),
})

// ==================== POST — Re-sync one addon group to its template ====================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = syncSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { addonGroupId } = parsed.data
    const supabase = getSupabaseAdmin()

    // Load the addon group and confirm it belongs to this product
    const { data: group } = await supabase
      .from('product_addon_groups')
      .select('*')
      .eq('id', addonGroupId)
      .maybeSingle()

    if (!group || group.productId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Addon group not found for this product' },
        { status: 404 }
      )
    }

    if (!group.templateGroupId) {
      return NextResponse.json(
        { success: false, error: 'Group is not linked to a template.' },
        { status: 400 }
      )
    }

    // Load the category addon template
    const { data: template } = await supabase
      .from('category_addon_templates')
      .select('*')
      .eq('id', group.templateGroupId)
      .maybeSingle()

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Linked template no longer exists' },
        { status: 404 }
      )
    }

    const { data: templateOptions } = await supabase
      .from('category_addon_template_options')
      .select('*')
      .eq('templateId', template.id)
      .order('sortOrder', { ascending: true })

    // Update addon group to match template
    await supabase.from('product_addon_groups').update({
      name: template.name,
      description: template.description,
      type: template.type,
      required: template.required,
      maxLength: template.maxLength,
      placeholder: template.placeholder,
      acceptedFileTypes: template.acceptedFileTypes,
      maxFileSizeMb: template.maxFileSizeMb,
      isOverridden: false,
      updatedAt: new Date().toISOString(),
    }).eq('id', addonGroupId)

    // Delete existing options and insert fresh from template
    await supabase.from('product_addon_options').delete().eq('groupId', addonGroupId)

    for (const opt of (templateOptions || [])) {
      await supabase.from('product_addon_options').insert({
        groupId: addonGroupId,
        label: opt.label,
        price: opt.price,
        image: opt.image,
        isDefault: opt.isDefault,
        sortOrder: opt.sortOrder,
      })
    }

    // Return the updated group with options
    const { data: updatedGroup } = await supabase
      .from('product_addon_groups')
      .select('*, product_addon_options(*)')
      .eq('id', addonGroupId)
      .single()

    const result = {
      ...updatedGroup,
      options: ((updatedGroup?.product_addon_options || []) as Record<string, unknown>[]).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/admin/products/[id]/sync-addon-group error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync addon group' },
      { status: 500 }
    )
  }
}
