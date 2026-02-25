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
      subjectImageUrl: 'subject_image_url',
      targetCitySlug: 'target_city_slug',
      theme: 'theme',
      contentWidth: 'content_width',
      titleSize: 'title_size',
      subtitleSize: 'subtitle_size',
      verticalAlign: 'vertical_align',
      heroSize: 'hero_size',
      contentPadding: 'content_padding',
      contentX: 'content_x',
      contentY: 'content_y',
      contentW: 'content_w',
      contentH: 'content_h',
      heroX: 'hero_x',
      heroY: 'hero_y',
      heroW: 'hero_w',
      heroH: 'hero_h',
      contentLockRatio: 'content_lock_ratio',
      heroLockRatio: 'hero_lock_ratio',
      ctaBgColor: 'cta_bg_color',
      ctaTextColor: 'cta_text_color',
      ctaBorderColor: 'cta_border_color',
      badgeBgColor: 'badge_bg_color',
      badgeTextColor: 'badge_text_color',
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
      subjectImageUrl: data.subject_image_url,
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
      theme: data.theme,
      contentWidth: data.content_width ?? 'medium',
      titleSize: data.title_size ?? 'lg',
      subtitleSize: data.subtitle_size ?? 'sm',
      verticalAlign: data.vertical_align ?? 'center',
      heroSize: data.hero_size ?? 'md',
      contentPadding: data.content_padding ?? 'normal',
      contentX: data.content_x ?? 5,
      contentY: data.content_y ?? 50,
      contentW: data.content_w ?? 55,
      contentH: data.content_h ?? 80,
      heroX: data.hero_x ?? 55,
      heroY: data.hero_y ?? 10,
      heroW: data.hero_w ?? 40,
      heroH: data.hero_h ?? 85,
      contentLockRatio: data.content_lock_ratio ?? false,
      heroLockRatio: data.hero_lock_ratio ?? false,
      ctaBgColor: data.cta_bg_color ?? '#E91E63',
      ctaTextColor: data.cta_text_color ?? '#FFFFFF',
      ctaBorderColor: data.cta_border_color ?? null,
      badgeBgColor: data.badge_bg_color ?? 'rgba(255,255,255,0.2)',
      badgeTextColor: data.badge_text_color ?? '#FFFFFF',
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
