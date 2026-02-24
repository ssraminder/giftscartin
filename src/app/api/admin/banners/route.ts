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

    return NextResponse.json({ success: true, data })
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
      title_html: body.title_html,
      image_url: body.image_url,
      cta_text: body.cta_text || 'Shop Now',
      cta_link: body.cta_link || '/',
      updated_at: new Date().toISOString(),
    }

    // Optional fields
    if (body.subtitle_html !== undefined) insertData.subtitle_html = body.subtitle_html
    if (body.secondary_cta_text !== undefined) insertData.secondary_cta_text = body.secondary_cta_text
    if (body.secondary_cta_link !== undefined) insertData.secondary_cta_link = body.secondary_cta_link
    if (body.text_position !== undefined) insertData.text_position = body.text_position
    if (body.overlay_style !== undefined) insertData.overlay_style = body.overlay_style
    if (body.badge_text !== undefined) insertData.badge_text = body.badge_text
    if (body.is_active !== undefined) insertData.is_active = body.is_active
    if (body.sort_order !== undefined) insertData.sort_order = body.sort_order
    if (body.valid_from !== undefined) insertData.valid_from = body.valid_from
    if (body.valid_until !== undefined) insertData.valid_until = body.valid_until
    if (body.target_city_slug !== undefined) insertData.target_city_slug = body.target_city_slug || null

    const { data, error } = await supabase
      .from('banners')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/banners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create banner' }, { status: 500 })
  }
}
