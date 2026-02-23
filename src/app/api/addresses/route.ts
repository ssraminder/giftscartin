import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)

    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('id, name, phone, address, landmark, city, state, pincode, isDefault')
      .eq('userId', session.id)
      .order('isDefault', { ascending: false })
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: addresses || [] })
  } catch (error) {
    console.error('GET /api/addresses error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch addresses' },
      { status: 500 }
    )
  }
}
