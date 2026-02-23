import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin(request: NextRequest) {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { data: surcharges, error } = await supabase
      .from('delivery_surcharges')
      .select('*')
      .order('startDate', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: surcharges })
  } catch (error) {
    console.error('GET /api/admin/delivery/surcharges error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch surcharges' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, startDate, endDate, amount, appliesTo, isActive } = body

    if (!name?.trim() || !startDate || !endDate || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, dates, and amount are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: surcharge, error } = await supabase
      .from('delivery_surcharges')
      .insert({
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amount,
        appliesTo: appliesTo || 'all',
        isActive: isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: surcharge }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/delivery/surcharges error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create surcharge' }, { status: 500 })
  }
}
