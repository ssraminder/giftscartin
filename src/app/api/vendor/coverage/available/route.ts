import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// GET: Fetch all active service_areas for the vendor's city
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.id || !isVendorRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get vendor's cityId
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, cityId')
      .eq('userId', session.id)
      .single()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor profile not found' },
        { status: 404 }
      )
    }

    // Fetch all active service areas for this city
    const { data: areas, error } = await supabase
      .from('service_areas')
      .select('id, name, pincode, city_name')
      .eq('city_id', vendor.cityId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    const mapped = (areas || []).map((a: { id: string; name: string; pincode: string; city_name: string }) => ({
      id: a.id,
      name: a.name,
      pincode: a.pincode,
      cityName: a.city_name,
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Vendor coverage available GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available areas' },
      { status: 500 }
    )
  }
}
