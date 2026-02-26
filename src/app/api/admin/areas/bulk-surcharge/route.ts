import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH: bulk update delivery_surcharge for all areas in a city
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { city_id, delivery_surcharge } = body

    if (!city_id) {
      return NextResponse.json(
        { success: false, error: 'city_id is required' },
        { status: 400 }
      )
    }

    const surcharge = Number(delivery_surcharge)
    if (isNaN(surcharge) || surcharge < 0) {
      return NextResponse.json(
        { success: false, error: 'delivery_surcharge must be a non-negative number' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: updated, error } = await supabase
      .from('service_areas')
      .update({
        delivery_surcharge: surcharge,
        updated_at: new Date().toISOString(),
      })
      .eq('city_id', city_id)
      .select('id')

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: { updated_count: updated?.length ?? 0 },
    })
  } catch (error) {
    console.error('Bulk surcharge update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update surcharges' },
      { status: 500 }
    )
  }
}
