import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function GET(request: NextRequest) {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sortOrder', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
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
    titleHtml: body.titleHtml,
    imageUrl: body.imageUrl,
    ctaText: body.ctaText || 'Shop Now',
    ctaLink: body.ctaLink || '/',
  }

  // Optional fields
  if (body.subtitleHtml !== undefined) insertData.subtitleHtml = body.subtitleHtml
  if (body.secondaryCtaText !== undefined) insertData.secondaryCtaText = body.secondaryCtaText
  if (body.secondaryCtaLink !== undefined) insertData.secondaryCtaLink = body.secondaryCtaLink
  if (body.textPosition !== undefined) insertData.textPosition = body.textPosition
  if (body.overlayStyle !== undefined) insertData.overlayStyle = body.overlayStyle
  if (body.badgeText !== undefined) insertData.badgeText = body.badgeText
  if (body.isActive !== undefined) insertData.isActive = body.isActive
  if (body.sortOrder !== undefined) insertData.sortOrder = body.sortOrder
  if (body.validFrom !== undefined) insertData.validFrom = body.validFrom
  if (body.validUntil !== undefined) insertData.validUntil = body.validUntil
  if (body.targetCitySlug !== undefined) insertData.targetCitySlug = body.targetCitySlug || null

  const { data, error } = await supabase
    .from('banners')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
