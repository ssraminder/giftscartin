import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (data || []).map((b: Record<string, any>) => ({
      id: b.id,
      titleHtml: b.title_html,
      subtitleHtml: b.subtitle_html,
      imageUrl: b.image_url,
      ctaText: b.cta_text,
      ctaLink: b.cta_link,
      secondaryCtaText: b.secondary_cta_text,
      secondaryCtaLink: b.secondary_cta_link,
      textPosition: b.text_position,
      overlayStyle: b.overlay_style,
      badgeText: b.badge_text,
      isActive: b.is_active,
      sortOrder: b.sort_order,
      validFrom: b.valid_from,
      validUntil: b.valid_until,
      targetCitySlug: b.target_city_slug,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('GET /api/admin/banners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch banners' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.titleHtml || !body.imageUrl || !body.ctaText || !body.ctaLink) {
      return NextResponse.json(
        { success: false, error: 'titleHtml, imageUrl, ctaText, and ctaLink are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const insertData: Record<string, unknown> = {
      title_html: body.titleHtml,
      image_url: body.imageUrl,
      cta_text: body.ctaText || 'Shop Now',
      cta_link: body.ctaLink || '/',
      updated_at: new Date().toISOString(),
    }

    // Optional fields
    if (body.subtitleHtml !== undefined) insertData.subtitle_html = body.subtitleHtml
    if (body.secondaryCtaText !== undefined) insertData.secondary_cta_text = body.secondaryCtaText
    if (body.secondaryCtaLink !== undefined) insertData.secondary_cta_link = body.secondaryCtaLink
    if (body.textPosition !== undefined) insertData.text_position = body.textPosition
    if (body.overlayStyle !== undefined) insertData.overlay_style = body.overlayStyle
    if (body.badgeText !== undefined) insertData.badge_text = body.badgeText
    if (body.isActive !== undefined) insertData.is_active = body.isActive
    if (body.sortOrder !== undefined) insertData.sort_order = body.sortOrder
    if (body.validFrom !== undefined) insertData.valid_from = body.validFrom
    if (body.validUntil !== undefined) insertData.valid_until = body.validUntil
    if (body.targetCitySlug !== undefined) insertData.target_city_slug = body.targetCitySlug || null

    const { data, error } = await supabase
      .from('banners')
      .insert(insertData)
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

    return NextResponse.json({ success: true, data: mapped }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/banners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create banner' }, { status: 500 })
  }
}
