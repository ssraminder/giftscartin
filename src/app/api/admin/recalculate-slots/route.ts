import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { recalculateCitySlotCutoff } from '@/lib/recalculate-city-slots'

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: cities, error } = await supabase
    .from('cities')
    .select('id')
    .eq('isActive', true)

  if (error) {
    console.error('Failed to fetch cities:', error)
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
  }

  for (const city of cities || []) {
    await recalculateCitySlotCutoff(city.id)
  }

  return NextResponse.json({
    success: true,
    message: `Recalculated slots for ${(cities || []).length} cities`,
  })
}
