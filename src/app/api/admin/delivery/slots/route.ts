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
    const { data: slots, error } = await supabase
      .from('delivery_slots')
      .select('*, city_delivery_configs(*, cities(name))')
      .order('name', { ascending: true })

    if (error) throw error

    const result = (slots || []).map((s: Record<string, unknown>) => ({
      ...s,
      cityConfigs: ((s.city_delivery_configs as Record<string, unknown>[]) || []).map((c: Record<string, unknown>) => ({ ...c, city: c.cities })),
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/admin/delivery/slots error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery slots' }, { status: 500 })
  }
}
