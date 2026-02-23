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

    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')
    const upcoming = searchParams.get('upcoming')
    const supabase = getSupabaseAdmin()

    let query = supabase.from('delivery_holidays').select('*, cities(name)').order('date', { ascending: true })
    if (cityId) query = query.eq('cityId', cityId)
    if (upcoming === 'true') query = query.gte('date', new Date().toISOString())

    const { data: holidays, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: (holidays || []).map((h: Record<string, unknown>) => ({ ...h, city: h.cities })) })
  } catch (error) {
    console.error('GET /api/admin/delivery/holidays error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch holidays' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, cityId, blockedSlots, reason } = body
    if (!date || !reason?.trim()) {
      return NextResponse.json({ success: false, error: 'Date and reason are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: holiday, error } = await supabase.from('delivery_holidays').insert({
      date: new Date(date).toISOString(),
      cityId: cityId || null,
      reason: reason.trim(),
      mode: !blockedSlots || blockedSlots.length === 0 ? 'FULL_BLOCK' : 'CUSTOM',
      slotOverrides: blockedSlots && blockedSlots.length > 0 ? { blockedSlots } : null,
    }).select('*, cities(name)').single()

    if (error) throw error
    return NextResponse.json({ success: true, data: { ...holiday, city: holiday.cities } }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/delivery/holidays error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create holiday' }, { status: 500 })
  }
}
