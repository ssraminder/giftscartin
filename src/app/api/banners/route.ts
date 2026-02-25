import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')

    const supabase = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('sort_order', { ascending: true })

    if (city) {
      query = query.or(`target_city_slug.is.null,target_city_slug.eq.${city}`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const mapped = (data ?? []).map(b => ({
      id: b.id,
      titleHtml: b.title_html,
      subtitleHtml: b.subtitle_html,
      imageUrl: b.image_url,
      subjectImageUrl: b.subject_image_url,
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
      theme: b.theme,
      contentWidth: b.content_width ?? 'medium',
      titleSize: b.title_size ?? 'lg',
      subtitleSize: b.subtitle_size ?? 'sm',
      verticalAlign: b.vertical_align ?? 'center',
      heroSize: b.hero_size ?? 'md',
      contentPadding: b.content_padding ?? 'normal',
      contentX: b.content_x ?? 5,
      contentY: b.content_y ?? 50,
      contentW: b.content_w ?? 55,
      contentH: b.content_h ?? 80,
      heroX: b.hero_x ?? 55,
      heroY: b.hero_y ?? 10,
      heroW: b.hero_w ?? 40,
      heroH: b.hero_h ?? 85,
      ctaBgColor: b.cta_bg_color ?? null,
      ctaTextColor: b.cta_text_color ?? null,
      ctaBorderColor: b.cta_border_color ?? null,
      badgeBgColor: b.badge_bg_color ?? null,
      badgeTextColor: b.badge_text_color ?? null,
      layers: b.layers ?? [],
      layout: b.layout ?? '16:9',
      mobileOnly: b.mobile_only ?? false,
    }))

    return NextResponse.json({ success: true, data: mapped }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('GET /api/banners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch banners' }, { status: 500 })
  }
}
