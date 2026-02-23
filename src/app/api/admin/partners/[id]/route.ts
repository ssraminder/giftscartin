import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest, type SessionUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin(request: NextRequest): Promise<SessionUser | null> {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) return null
  return user
}

// GET: single partner
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { data: partner } = await supabase
      .from('partners')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 })
    }

    // Get related data
    let defaultCity = null
    if (partner.default_city_id) {
      const { data: city } = await supabase.from('cities').select('name').eq('id', partner.default_city_id).maybeSingle()
      defaultCity = city ? { name: city.name } : null
    }

    let defaultVendor = null
    if (partner.default_vendor_id) {
      const { data: vendor } = await supabase.from('vendors').select('businessName').eq('id', partner.default_vendor_id).maybeSingle()
      defaultVendor = vendor ? { businessName: vendor.businessName } : null
    }

    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('partnerId', params.id)
    const { count: earningCount } = await supabase.from('partner_earnings').select('*', { count: 'exact', head: true }).eq('partnerId', params.id)

    return NextResponse.json({
      success: true,
      data: {
        ...partner,
        defaultCity,
        defaultVendor,
        _count: { orders: orderCount ?? 0, earnings: earningCount ?? 0 },
      },
    })
  } catch (error) {
    console.error('GET /api/admin/partners/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch partner' }, { status: 500 })
  }
}

// PATCH: update partner
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name, refCode, commissionPercent, defaultCityId, defaultVendorId,
      logoUrl, primaryColor, showPoweredBy, isActive,
    } = body

    const supabase = getSupabaseAdmin()

    // Check refCode uniqueness if changing
    if (refCode) {
      const { data: existing } = await supabase
        .from('partners')
        .select('id')
        .eq('refCode', refCode.trim().toLowerCase())
        .neq('id', params.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ success: false, error: 'Ref code already in use' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (refCode !== undefined) updateData.refCode = refCode.trim().toLowerCase()
    if (commissionPercent !== undefined) updateData.commissionPercent = commissionPercent
    if (defaultCityId !== undefined) updateData.default_city_id = defaultCityId || null
    if (defaultVendorId !== undefined) updateData.default_vendor_id = defaultVendorId || null
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor
    if (showPoweredBy !== undefined) updateData.showPoweredBy = showPoweredBy
    if (isActive !== undefined) updateData.isActive = isActive

    const { data: partner, error } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    console.error('PATCH /api/admin/partners/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update partner' }, { status: 500 })
  }
}
