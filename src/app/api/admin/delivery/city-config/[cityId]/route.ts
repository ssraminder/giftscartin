import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin(request: NextRequest) {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { cityId } = await params
    const body = await request.json()
    const { baseDeliveryCharge, freeDeliveryAbove, slots } = body

    const supabase = getSupabaseAdmin()

    // Update city-level delivery settings if provided
    const cityData: Record<string, unknown> = {}
    if (baseDeliveryCharge !== undefined) cityData.baseDeliveryCharge = baseDeliveryCharge
    if (freeDeliveryAbove !== undefined) cityData.freeDeliveryAbove = freeDeliveryAbove

    if (Object.keys(cityData).length > 0) {
      cityData.updatedAt = new Date().toISOString()
      const { error } = await supabase
        .from('cities')
        .update(cityData)
        .eq('id', cityId)
      if (error) throw error
    }

    // Upsert city_delivery_configs for each slot
    if (slots && Array.isArray(slots)) {
      for (const slot of slots) {
        const { slotId, isAvailable, chargeOverride } = slot
        const resolvedCharge = chargeOverride !== undefined && chargeOverride !== null && chargeOverride !== '' ? chargeOverride : null

        // Check if config exists
        const { data: existing } = await supabase
          .from('city_delivery_configs')
          .select('id')
          .eq('cityId', cityId)
          .eq('slotId', slotId)
          .single()

        if (existing) {
          const { error } = await supabase
            .from('city_delivery_configs')
            .update({
              isAvailable,
              chargeOverride: resolvedCharge,
              updatedAt: new Date().toISOString(),
            })
            .eq('cityId', cityId)
            .eq('slotId', slotId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('city_delivery_configs')
            .insert({
              cityId,
              slotId,
              isAvailable,
              chargeOverride: resolvedCharge,
            })
          if (error) throw error
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/admin/delivery/city-config/[cityId] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update city config' }, { status: 500 })
  }
}
