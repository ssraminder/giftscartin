import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')

    const supabase = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('sort_order', { ascending: true })

    if (city) {
      query = query.or(`target_city_slug.is.null,target_city_slug.eq.${city}`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('GET /api/banners error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch banners' }, { status: 500 })
  }
}
