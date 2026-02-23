import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get('cityId')

  if (!cityId) {
    return NextResponse.json(
      { success: false, error: 'cityId required' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  // Note: city_slot_cutoff uses @map columns:
  // city_id, slot_id, slot_name, slot_slug, slot_start, slot_end,
  // cutoff_hours, base_charge, min_vendors, is_available, updated_at
  const { data: cutoffs, error } = await supabase
    .from('city_slot_cutoff')
    .select('*')
    .eq('city_id', cityId)
    .eq('is_available', true)
    .order('slot_start', { ascending: true })

  if (error) {
    console.error('[delivery/city-slots]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch city slots' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      cityId,
      slots: (cutoffs || []).map((c: Record<string, unknown>) => ({
        slotId:      c.slot_id,
        name:        c.slot_name,
        slug:        c.slot_slug,
        startTime:   c.slot_start,
        endTime:     c.slot_end,
        cutoffHours: c.cutoff_hours,
        baseCharge:  Number(c.base_charge),
      })),
      updatedAt: (cutoffs && cutoffs.length > 0) ? cutoffs[0].updated_at : null,
    },
  })
}
