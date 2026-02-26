import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole } from '@/lib/roles'
import { resolvePincode } from '@/lib/pincode-resolver'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const createAreaSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit pincode required'),
  areaName: z.string().min(1).max(100).optional(),
  deliverySurcharge: z.number().min(0).default(0),
})

// POST: Vendor creates a new service area by pincode, links as vendor_service_area (PENDING)
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.id || !isVendorRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createAreaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { pincode, areaName, deliverySurcharge } = parsed.data
    const supabase = getSupabaseAdmin()

    // Get vendor
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

    // Check if service_area already exists for this pincode
    const { data: existingArea } = await supabase
      .from('service_areas')
      .select('id, name, pincode, city_name')
      .eq('pincode', pincode)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    let serviceAreaId: string

    if (existingArea) {
      serviceAreaId = existingArea.id
    } else {
      // Resolve pincode to get area details
      const resolved = await resolvePincode(pincode)

      // Get vendor's city info for fallback
      const { data: city } = await supabase
        .from('cities')
        .select('id, name, state, lat, lng')
        .eq('id', vendor.cityId)
        .single()

      const name = areaName || resolved?.name || pincode
      const lat = resolved?.lat || Number(city?.lat || 0)
      const lng = resolved?.lng || Number(city?.lng || 0)
      const cityId = resolved?.cityId || vendor.cityId
      const cityName = resolved?.cityName || city?.name || ''
      const state = resolved?.state || city?.state || ''

      const { data: newArea, error: createError } = await supabase
        .from('service_areas')
        .insert({
          name,
          pincode,
          city_id: cityId,
          city_name: cityName,
          state,
          lat,
          lng,
          is_active: true,
        })
        .select('id, name, pincode, city_name')
        .single()

      if (createError) {
        console.error('Create service_area error:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create service area' },
          { status: 500 }
        )
      }

      serviceAreaId = newArea.id
    }

    // Check if vendor already has this area
    const { data: existingVsa } = await supabase
      .from('vendor_service_areas')
      .select('id, status')
      .eq('vendor_id', vendor.id)
      .eq('service_area_id', serviceAreaId)
      .maybeSingle()

    if (existingVsa) {
      return NextResponse.json({
        success: false,
        error: `This area is already in your coverage (${existingVsa.status})`,
      }, { status: 409 })
    }

    // Create vendor_service_area as PENDING
    const { data: vsa, error: vsaError } = await supabase
      .from('vendor_service_areas')
      .insert({
        vendor_id: vendor.id,
        service_area_id: serviceAreaId,
        delivery_surcharge: deliverySurcharge,
        status: 'PENDING',
        is_active: false,
        requested_at: new Date().toISOString(),
      })
      .select('*, service_areas(name, pincode, city_name)')
      .single()

    if (vsaError) {
      console.error('Create vendor_service_area error:', vsaError)
      return NextResponse.json(
        { success: false, error: 'Failed to add area to coverage' },
        { status: 500 }
      )
    }

    const sa = vsa.service_areas as { name: string; pincode: string; city_name: string } | null

    return NextResponse.json({
      success: true,
      data: {
        id: vsa.id,
        serviceAreaId: vsa.service_area_id,
        name: sa?.name || '',
        pincode: sa?.pincode || '',
        cityName: sa?.city_name || '',
        deliverySurcharge: Number(vsa.delivery_surcharge),
        status: vsa.status,
        isActive: vsa.is_active,
        requestedAt: vsa.requested_at,
        serviceAreaCreated: !existingArea,
      },
    })
  } catch (error) {
    console.error('Vendor create-area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create area' },
      { status: 500 }
    )
  }
}
