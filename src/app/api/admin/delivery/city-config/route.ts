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

    const { data: cities, error } = await supabase
      .from('cities')
      .select('id, name, slug, baseDeliveryCharge, freeDeliveryAbove, city_delivery_configs(*, delivery_slots(id, name, slug, baseCharge, startTime, endTime))')
      .eq('isActive', true)
      .order('name', { ascending: true })

    if (error) throw error

    // Reshape to match Prisma's include format: deliveryConfig with nested slot
    const shaped = (cities || []).map((city: Record<string, unknown>) => {
      const configs = (city.city_delivery_configs as Record<string, unknown>[]) || []
      return {
        id: city.id,
        name: city.name,
        slug: city.slug,
        baseDeliveryCharge: city.baseDeliveryCharge,
        freeDeliveryAbove: city.freeDeliveryAbove,
        deliveryConfig: configs.map((cfg: Record<string, unknown>) => ({
          ...cfg,
          slot: cfg.delivery_slots,
          delivery_slots: undefined,
        })),
        city_delivery_configs: undefined,
      }
    })

    return NextResponse.json({ success: true, data: shaped })
  } catch (error) {
    console.error('GET /api/admin/delivery/city-config error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch city configs' }, { status: 500 })
  }
}
