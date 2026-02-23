import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest, type SessionUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin(request: NextRequest): Promise<SessionUser | null> {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) return null
  return user
}

// GET: list all partners
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) throw error

    // Get related data
    const partnerIds = (partners || []).map(p => p.id)
    const cityIds = (partners || []).map(p => p.default_city_id).filter(Boolean)
    const vendorIds = (partners || []).map(p => p.default_vendor_id).filter(Boolean)

    let cityMap: Record<string, string> = {}
    if (cityIds.length > 0) {
      const { data: cities } = await supabase.from('cities').select('id, name').in('id', cityIds)
      cityMap = Object.fromEntries((cities || []).map(c => [c.id, c.name]))
    }

    let vendorMap: Record<string, string> = {}
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors').select('id, businessName').in('id', vendorIds)
      vendorMap = Object.fromEntries((vendors || []).map(v => [v.id, v.businessName]))
    }

    // Count orders and earnings per partner
    const orderCounts: Record<string, number> = {}
    const earningCounts: Record<string, number> = {}
    if (partnerIds.length > 0) {
      const { data: orderRows } = await supabase.from('orders').select('partnerId').in('partnerId', partnerIds)
      for (const row of (orderRows || [])) {
        if (row.partnerId) orderCounts[row.partnerId] = (orderCounts[row.partnerId] || 0) + 1
      }
      const { data: earningRows } = await supabase.from('partner_earnings').select('partnerId').in('partnerId', partnerIds)
      for (const row of (earningRows || [])) {
        earningCounts[row.partnerId] = (earningCounts[row.partnerId] || 0) + 1
      }
    }

    const result = (partners || []).map(p => ({
      ...p,
      defaultCity: p.default_city_id ? { name: cityMap[p.default_city_id] || null } : null,
      defaultVendor: p.default_vendor_id ? { businessName: vendorMap[p.default_vendor_id] || null } : null,
      _count: {
        orders: orderCounts[p.id] || 0,
        earnings: earningCounts[p.id] || 0,
      },
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/admin/partners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch partners' }, { status: 500 })
  }
}

// POST: create new partner
export async function POST(request: NextRequest) {
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

    if (!name?.trim() || !refCode?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and ref code are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Check refCode uniqueness
    const { data: existing } = await supabase
      .from('partners')
      .select('id')
      .eq('refCode', refCode.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Ref code already in use' }, { status: 409 })
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .insert({
        name: name.trim(),
        refCode: refCode.trim().toLowerCase(),
        commissionPercent: commissionPercent ?? 5,
        default_city_id: defaultCityId || null,
        default_vendor_id: defaultVendorId || null,
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || '#E91E63',
        showPoweredBy: showPoweredBy ?? true,
        isActive: isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: partner }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/partners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create partner' }, { status: 500 })
  }
}
