import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('banners')
    .select('*')
    .eq('isActive', true)
    .or(`validFrom.is.null,validFrom.lte.${today}`)
    .or(`validUntil.is.null,validUntil.gte.${today}`)
    .order('sortOrder', { ascending: true })

  if (city) {
    query = query.or(`targetCitySlug.is.null,targetCitySlug.eq.${city}`)
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
}
