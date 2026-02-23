import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: cities, error } = await supabase
      .from('cities')
      .select('id, name, slug, state, baseDeliveryCharge, freeDeliveryAbove')
      .eq('isActive', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Cities query error:', error)
      throw error
    }

    return NextResponse.json({ success: true, data: { cities: cities || [] } })
  } catch (error) {
    console.error('GET /api/cities error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
