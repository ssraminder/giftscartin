import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Map camelCase input from client to snake_case for Supabase
    const fieldMap: Record<string, string> = {
      titleHtml: 'title_html',
      subtitleHtml: 'subtitle_html',
      imageUrl: 'image_url',
      ctaText: 'cta_text',
      ctaLink: 'cta_link',
      secondaryCtaText: 'secondary_cta_text',
      secondaryCtaLink: 'secondary_cta_link',
      textPosition: 'text_position',
      overlayStyle: 'overlay_style',
      badgeText: 'badge_text',
      isActive: 'is_active',
      sortOrder: 'sort_order',
      validFrom: 'valid_from',
      validUntil: 'valid_until',
      targetCitySlug: 'target_city_slug',
    }

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (body[camel] !== undefined) {
        updateData[snake] = body[camel]
      }
    }

    const { data, error } = await supabase
      .from('banners')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const mapped = data ? {
      id: data.id,
      titleHtml: data.title_html,
      subtitleHtml: data.subtitle_html,
      imageUrl: data.image_url,
      ctaText: data.cta_text,
      ctaLink: data.cta_link,
      secondaryCtaText: data.secondary_cta_text,
      secondaryCtaLink: data.secondary_cta_link,
      textPosition: data.text_position,
      overlayStyle: data.overlay_style,
      badgeText: data.badge_text,
      isActive: data.is_active,
      sortOrder: data.sort_order,
      validFrom: data.valid_from,
      validUntil: data.valid_until,
      targetCitySlug: data.target_city_slug,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } : null

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('PATCH /api/admin/banners/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update banner' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/banners/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete banner' }, { status: 500 })
  }
}
