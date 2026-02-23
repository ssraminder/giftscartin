import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

// ==================== POST — Bulk propagate all templates to linked products ====================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch category templates
    const { data: templates } = await supabase
      .from('category_addon_templates')
      .select('*')
      .eq('categoryId', params.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })

    if (!templates || templates.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found or no templates' }, { status: 404 })
    }

    let templatesProcessed = 0
    let groupsUpdated = 0

    for (const template of templates) {
      templatesProcessed++

      // Fetch template options
      const { data: templateOptions } = await supabase
        .from('category_addon_template_options')
        .select('*')
        .eq('templateId', template.id)
        .order('sortOrder', { ascending: true })

      // Find all linked product addon groups that are not overridden
      const { data: linkedGroups } = await supabase
        .from('product_addon_groups')
        .select('id')
        .eq('templateGroupId', template.id)
        .eq('isOverridden', false)

      for (const group of (linkedGroups || [])) {
        await supabase.from('product_addon_groups').update({
          name: template.name,
          description: template.description,
          type: template.type,
          required: template.required,
          maxLength: template.maxLength,
          placeholder: template.placeholder,
          acceptedFileTypes: template.acceptedFileTypes,
          maxFileSizeMb: template.maxFileSizeMb,
          updatedAt: new Date().toISOString(),
        }).eq('id', group.id)

        // Replace options
        await supabase.from('product_addon_options').delete().eq('groupId', group.id)
        for (const opt of (templateOptions || [])) {
          await supabase.from('product_addon_options').insert({
            groupId: group.id,
            label: opt.label,
            price: opt.price,
            image: opt.image,
            isDefault: opt.isDefault,
            sortOrder: opt.sortOrder,
          })
        }

        groupsUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      data: { templatesProcessed, groupsUpdated },
    })
  } catch (error) {
    console.error('POST /api/admin/categories/[id]/sync-templates error:', error)
    return NextResponse.json({ success: false, error: 'Failed to sync templates' }, { status: 500 })
  }
}
