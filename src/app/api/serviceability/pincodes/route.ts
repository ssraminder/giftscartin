export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const cityId = request.nextUrl.searchParams.get('cityId')

    if (!cityId) {
      return NextResponse.json(
        { success: false, error: 'cityId query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Find all pincodes served by APPROVED + online vendors in this city
    // vendor_pincodes: vendorId, isActive are camelCase (no @map)
    // vendors: cityId, isOnline are camelCase (no @map)
    const { data: vendorPincodeRows } = await supabase
      .from('vendor_pincodes')
      .select('pincode, vendors(id, cityId, status, isOnline)')
      .eq('isActive', true)

    const serviceablePincodeSet = new Set<string>()
    for (const row of vendorPincodeRows || []) {
      const vendor = row.vendors as unknown as { id: string; cityId: string; status: string; isOnline: boolean } | null
      if (
        vendor &&
        vendor.cityId === cityId &&
        vendor.status === 'APPROVED' &&
        vendor.isOnline === true
      ) {
        serviceablePincodeSet.add(row.pincode)
      }
    }

    // Find all pincodes in service_areas for this city (for coming-soon detection)
    // service_areas: city_id has @map -> snake_case, is_active has @map -> snake_case
    const { data: serviceAreaRows } = await supabase
      .from('service_areas')
      .select('pincode')
      .eq('city_id', cityId)
      .eq('is_active', true)

    const comingSoonPincodeSet = new Set<string>()
    for (const row of serviceAreaRows || []) {
      if (row.pincode && !serviceablePincodeSet.has(row.pincode)) {
        comingSoonPincodeSet.add(row.pincode)
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          serviceablePincodes: Array.from(serviceablePincodeSet),
          comingSoonPincodes: Array.from(comingSoonPincodeSet),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('GET /api/serviceability/pincodes error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch serviceable pincodes' },
      { status: 500 }
    )
  }
}
