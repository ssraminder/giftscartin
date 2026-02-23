import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.role || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const phone = request.nextUrl.searchParams.get('phone')
    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Valid Indian phone number required (+91 followed by 10 digits)' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('phone', phone)
      .maybeSingle()

    return NextResponse.json({ success: true, data: user || null })
  } catch (error) {
    console.error('GET /api/admin/customers/lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup customer' },
      { status: 500 }
    )
  }
}
