import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const supabase = getSupabaseAdmin()

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  }

  const allowedFields = [
    'titleHtml', 'subtitleHtml', 'imageUrl', 'ctaText', 'ctaLink',
    'secondaryCtaText', 'secondaryCtaLink', 'textPosition', 'overlayStyle',
    'badgeText', 'isActive', 'sortOrder', 'validFrom', 'validUntil', 'targetCitySlug',
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
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

  return NextResponse.json({ success: true, data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
}
