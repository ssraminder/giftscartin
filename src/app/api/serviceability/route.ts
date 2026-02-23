import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod/v4'

const serviceabilitySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)').optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  productId: z.string().optional(),
}).refine(
  (data) => data.pincode || (data.lat !== undefined && data.lng !== undefined),
  { message: 'Either pincode or lat/lng coordinates are required' }
)

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = serviceabilitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { pincode, lat, lng, productId } = parsed.data

    // Two paths: pincode-based or lat/lng-based

    // ------- Path A: Pincode provided -> lookup service_areas -------
    if (pincode) {
      const supabase = getSupabaseAdmin()

      // Note: service_areas uses @map columns: city_id, city_name, is_active, created_at, updated_at
      const { data: serviceArea } = await supabase
        .from('service_areas')
        .select('*, cities(id, name, slug, isActive, baseDeliveryCharge, freeDeliveryAbove)')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!serviceArea) {
        // No service_areas row -> not serviceable
        // But if lat/lng also provided, try coordinate-based matching
        if (lat !== undefined && lng !== undefined) {
          return handleCoordinateSearch(lat, lng, productId)
        }
        return NextResponse.json({
          success: true,
          data: {
            isServiceable: false,
            serviceable: false,
            message: 'Sorry, we do not deliver to this pincode yet.',
            vendorCount: 0,
            deliveryCharge: 0,
            availableSlots: [],
            freeDeliveryAbove: 0,
          },
        })
      }

      const areaLat = serviceArea.lat ? Number(serviceArea.lat) : null
      const areaLng = serviceArea.lng ? Number(serviceArea.lng) : null

      return handleFullServiceability(
        pincode,
        serviceArea.city_id,
        serviceArea.cities as { id: string; name: string; slug: string; isActive: boolean; baseDeliveryCharge: unknown; freeDeliveryAbove: unknown },
        serviceArea.name,
        areaLat,
        areaLng,
        productId
      )
    }

    // ------- Path B: Only lat/lng provided (Google Places result) -------
    if (lat !== undefined && lng !== undefined) {
      return handleCoordinateSearch(lat, lng, productId)
    }

    return NextResponse.json(
      { success: false, error: 'Either pincode or lat/lng coordinates are required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('POST /api/serviceability error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check serviceability' },
      { status: 500 }
    )
  }
}

/** Handle lat/lng only -- find nearest service area or do radius vendor match */
async function handleCoordinateSearch(
  lat: number,
  lng: number,
  productId?: string
) {
  const supabase = getSupabaseAdmin()

  // Try to find the nearest service area by coordinates
  const { data: serviceAreas } = await supabase
    .from('service_areas')
    .select('*, cities(id, name, slug, isActive, baseDeliveryCharge, freeDeliveryAbove)')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  // Find the closest service area within 15km
  let closestArea: Record<string, unknown> | null = null
  let closestDist = Infinity

  for (const area of serviceAreas || []) {
    const aLat = Number(area.lat)
    const aLng = Number(area.lng)
    const dist = haversineKm(lat, lng, aLat, aLng)
    if (dist < closestDist && dist <= 15) {
      closestDist = dist
      closestArea = area
    }
  }

  if (closestArea) {
    // Found a nearby service area -- use its pincode & city for full check
    return handleFullServiceability(
      closestArea.pincode as string,
      closestArea.city_id as string,
      closestArea.cities as { id: string; name: string; slug: string; isActive: boolean; baseDeliveryCharge: unknown; freeDeliveryAbove: unknown },
      closestArea.name as string,
      lat, // use the provided coords for radius matching
      lng,
      productId
    )
  }

  // No nearby service area -- do pure radius vendor match with provided coords
  const radiusVendorIds = await getRadiusVendorIds({ lat, lng })

  if (radiusVendorIds.length > 0) {
    // Vendors found by radius -- get the first vendor's city for delivery config
    const { data: vendorWithCity } = await supabase
      .from('vendors')
      .select('id, cityId, cities(id, name, slug, isActive, baseDeliveryCharge, freeDeliveryAbove)')
      .in('id', radiusVendorIds)
      .limit(1)
      .single()

    if (vendorWithCity) {
      const city = vendorWithCity.cities as unknown as { id: string; name: string; slug: string; isActive: boolean; baseDeliveryCharge: unknown; freeDeliveryAbove: unknown }

      const { data: deliveryConfigs } = await supabase
        .from('city_delivery_configs')
        .select('chargeOverride, delivery_slots(id, name, slug, startTime, endTime, isActive, baseCharge)')
        .eq('cityId', vendorWithCity.cityId)
        .eq('isAvailable', true)

      const availableSlots = buildSlotsList(deliveryConfigs || [])
      const deliveryCharge = Number(city.baseDeliveryCharge)
      const freeDeliveryAbove = Number(city.freeDeliveryAbove)

      let productAvailable = true
      if (productId) {
        const { data: vendorProduct } = await supabase
          .from('vendor_products')
          .select('id')
          .eq('productId', productId)
          .eq('isAvailable', true)
          .in('vendorId', radiusVendorIds)
          .limit(1)
          .maybeSingle()

        productAvailable = !!vendorProduct
      }

      return NextResponse.json({
        success: true,
        data: {
          isServiceable: true,
          serviceable: true,
          city,
          areaName: null,
          vendorCount: radiusVendorIds.length,
          productAvailable,
          deliveryCharge,
          freeDeliveryAbove,
          availableSlots,
          deliverySlots: availableSlots,
        },
      })
    }
  }

  // No vendors found anywhere
  return NextResponse.json({
    success: true,
    data: {
      isServiceable: false,
      serviceable: false,
      message: "We don't serve this area yet. We're expanding soon!",
      vendorCount: 0,
      deliveryCharge: 0,
      availableSlots: [],
      freeDeliveryAbove: 0,
    },
  })
}

/** Full serviceability check: 3-tier vendor matching (pincode + zone + radius) */
async function handleFullServiceability(
  pincode: string,
  cityId: string,
  city: {
    id: string
    name: string
    slug: string
    isActive: boolean
    baseDeliveryCharge: unknown
    freeDeliveryAbove: unknown
  },
  areaName: string,
  lat: number | null,
  lng: number | null,
  productId?: string
) {
  const supabase = getSupabaseAdmin()

  // Method 1: Pincode match
  const { data: pincodeVendors } = await supabase
    .from('vendor_pincodes')
    .select('vendorId, vendors(status)')
    .eq('pincode', pincode)
    .eq('isActive', true)

  const pincodeVendorIds = (pincodeVendors || [])
    .filter((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as { status: string } | null
      return vendor?.status === 'APPROVED'
    })
    .map((vp: { vendorId: string }) => vp.vendorId)

  // Method 2: Zone match
  const { data: zones } = await supabase
    .from('city_zones')
    .select('id')
    .contains('pincodes', [pincode])
    .eq('isActive', true)
    .eq('cityId', cityId)

  const zoneIds = (zones || []).map((z: { id: string }) => z.id)
  let zoneVendorIds: string[] = []
  if (zoneIds.length > 0) {
    const { data: vendorZones } = await supabase
      .from('vendor_zones')
      .select('vendorId, vendors(status)')
      .in('zoneId', zoneIds)

    zoneVendorIds = (vendorZones || [])
      .filter((vz: Record<string, unknown>) => {
        const vendor = vz.vendors as { status: string } | null
        return vendor?.status === 'APPROVED'
      })
      .map((vz: { vendorId: string }) => vz.vendorId)
  }

  // Method 3: Radius match
  const radiusVendorIds = await getRadiusVendorIds(
    lat !== null && lng !== null ? { lat, lng } : null
  )

  // Merge all vendor IDs (deduplicate)
  const allVendorIdSet = new Set<string>()
  for (const id of pincodeVendorIds) allVendorIdSet.add(id)
  for (const id of zoneVendorIds) allVendorIdSet.add(id)
  for (const id of radiusVendorIds) allVendorIdSet.add(id)

  const vendorCount = allVendorIdSet.size

  // No vendors but service_areas row exists -> coming soon
  if (vendorCount === 0) {
    return NextResponse.json({
      success: true,
      data: {
        isServiceable: true,
        serviceable: true,
        comingSoon: true,
        message:
          "We're coming to your area soon! Place your order and our team will confirm delivery.",
        vendorCount: 0,
        deliveryCharge: 0,
        availableSlots: [],
        cityName: city.name,
        areaName,
        freeDeliveryAbove: 0,
      },
    })
  }

  // Vendors found -> full serviceable response
  let productAvailable = true
  if (productId) {
    const allVendorIds = Array.from(allVendorIdSet)
    const { data: vendorProduct } = await supabase
      .from('vendor_products')
      .select('id')
      .eq('productId', productId)
      .eq('isAvailable', true)
      .in('vendorId', allVendorIds)
      .limit(1)
      .maybeSingle()

    productAvailable = !!vendorProduct
  }

  const { data: deliveryConfigs } = await supabase
    .from('city_delivery_configs')
    .select('chargeOverride, delivery_slots(id, name, slug, startTime, endTime, isActive, baseCharge)')
    .eq('cityId', cityId)
    .eq('isAvailable', true)

  const availableSlots = await buildSlotsListWithFallback(deliveryConfigs || [])
  const deliveryCharge = Number(city.baseDeliveryCharge)
  const freeDeliveryAbove = Number(city.freeDeliveryAbove)

  return NextResponse.json({
    success: true,
    data: {
      isServiceable: true,
      serviceable: true,
      city,
      areaName,
      vendorCount,
      productAvailable,
      deliveryCharge,
      freeDeliveryAbove,
      availableSlots,
      deliverySlots: availableSlots,
    },
  })
}

/** Build delivery slots list from city configs */
function buildSlotsList(
  deliveryConfigs: Array<Record<string, unknown>>
) {
  return deliveryConfigs
    .filter((dc) => {
      const slot = dc.delivery_slots as { isActive: boolean } | null
      return slot?.isActive
    })
    .map((dc) => {
      const slot = dc.delivery_slots as {
        id: string
        name: string
        slug: string
        startTime: string
        endTime: string
        baseCharge: unknown
      }
      return {
        id: slot.id,
        name: slot.name,
        slug: slot.slug,
        startTime: slot.startTime,
        endTime: slot.endTime,
        charge: Number(dc.chargeOverride ?? slot.baseCharge),
      }
    })
}

/** Build delivery slots list with fallback to all active slots */
async function buildSlotsListWithFallback(
  deliveryConfigs: Array<Record<string, unknown>>
) {
  if (deliveryConfigs.length > 0) {
    return buildSlotsList(deliveryConfigs)
  }

  const supabase = getSupabaseAdmin()
  const { data: allSlots } = await supabase
    .from('delivery_slots')
    .select('*')
    .eq('isActive', true)

  return (allSlots || []).map((slot: {
    id: string
    name: string
    slug: string
    startTime: string
    endTime: string
    baseCharge: unknown
  }) => ({
    id: slot.id,
    name: slot.name,
    slug: slot.slug,
    startTime: slot.startTime,
    endTime: slot.endTime,
    charge: Number(slot.baseCharge),
  }))
}

/** Get vendor IDs within delivery radius of given coordinates */
async function getRadiusVendorIds(
  coords: { lat: number; lng: number } | null,
): Promise<string[]> {
  if (!coords) return []

  const { lat, lng } = coords
  const supabase = getSupabaseAdmin()

  // Note: vendors table uses @map columns: delivery_radius_km
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, lat, lng, delivery_radius_km')
    .eq('status', 'APPROVED')
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  const matchedIds: string[] = []
  for (const vendor of vendors || []) {
    const vLat = Number(vendor.lat)
    const vLng = Number(vendor.lng)
    const radius = Number(vendor.delivery_radius_km)
    const distance = haversineKm(lat, lng, vLat, vLng)
    if (distance <= radius) {
      matchedIds.push(vendor.id)
    }
  }

  return matchedIds
}
