import { getSupabaseAdmin } from './supabase'

export async function recalculateCitySlotCutoff(
  cityId: string
): Promise<void> {
  const supabase = getSupabaseAdmin()

  const [slotsResult, vendorsResult] = await Promise.all([
    supabase.from('delivery_slots').select('*').eq('isActive', true),
    supabase
      .from('vendors')
      .select('id, vendor_slots(*)')
      .eq('cityId', cityId)
      .eq('status', 'APPROVED'),
  ])

  const slots = slotsResult.data || []
  const vendors = vendorsResult.data || []

  await Promise.all(
    slots.map(async (slot) => {
      const activeVendorCount = vendors.filter((vendor) => {
        const vendorSlots = (vendor.vendor_slots as Array<Record<string, unknown>>) || []
        const vendorSlot = vendorSlots.find(
          (vs) => vs.slotId === slot.id
        )
        return (vendorSlot as Record<string, unknown> | undefined)?.isEnabled === true
      }).length

      const cutoffHours = getCutoffHours(slot.slug)

      // Check if record exists
      const { data: existing } = await supabase
        .from('city_slot_cutoff')
        .select('id')
        .eq('city_id', cityId)
        .eq('slot_id', slot.id)
        .single()

      if (existing) {
        await supabase
          .from('city_slot_cutoff')
          .update({
            min_vendors: activeVendorCount,
            is_available: activeVendorCount > 0,
            slot_name: slot.name,
            slot_slug: slot.slug,
            slot_start: slot.startTime,
            slot_end: slot.endTime,
            cutoff_hours: cutoffHours,
            base_charge: slot.baseCharge,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('city_slot_cutoff')
          .insert({
            city_id: cityId,
            slot_id: slot.id,
            slot_name: slot.name,
            slot_slug: slot.slug,
            slot_start: slot.startTime,
            slot_end: slot.endTime,
            cutoff_hours: cutoffHours,
            base_charge: slot.baseCharge,
            min_vendors: activeVendorCount,
            is_available: activeVendorCount > 0,
          })
      }
    })
  )
}

function getCutoffHours(slug: string): number {
  const map: Record<string, number> = {
    midnight:        6,
    'early-morning': 12,
    express:         2,
    'fixed-slot':    4,
    standard:        4,
  }
  return map[slug] ?? 4
}
