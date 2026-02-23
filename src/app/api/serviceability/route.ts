export const runtime = 'edge'

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

      const { data: serviceArea } = await supabase
        .from('service_areas')
        .select('*, cities(id, name, slug, is_active, base_delivery_charge, free_delivery_above)')
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
        serviceArea.cities as { id: string; name: string; slug: string; is_active: boolean; base_delivery_charge: unknown; free_delivery_above: unknown },
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
    .select('*, cities(id, name, slug, is_active, base_delivery_charge, free_delivery_above)')
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
      closestArea.cities as { id: string; name: string; slug: string; is_active: boolean; base_delivery_charge: unknown; free_delivery_above: unknown },
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
      .select('id, city_id, cities(id, name, slug, is_active, base_delivery_charge, free_delivery_above)')
      .in('id', radiusVendorIds)
      .limit(1)
      .single()

    if (vendorWithCity) {
      const city = vendorWithCity.cities as unknown as { id: string; name: string; slug: string; is_active: boolean; base_delivery_charge: unknown; free_delivery_above: unknown }

      const { data: slotCutoffs } = await supabase
        .from('city_slot_cutoff')
        .select('*')
        .eq('city_id', vendorWithCity.city_id)
        .eq('is_available', true)

      const availableSlots = buildSlotsList(slotCutoffs || [])
      const deliveryCharge = Number(city.base_delivery_charge)
      const freeDeliveryAbove = Number(city.free_delivery_above)

      let productAvailable = true
      if (productId) {
        const { data: vendorProduct } = await supabase
          .from('vendor_products')
          .select('id')
          .eq('product_id', productId)
          .eq('is_available', true)
          .in('vendor_id', radiusVendorIds)
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
    is_active: boolean
    base_delivery_charge: unknown
    free_delivery_above: unknown
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
    .select('vendor_id, vendors(status, is_online)')
    .eq('pincode', pincode)
    .eq('is_active', true)

  const pincodeVendorIds = (pincodeVendors || [])
    .filter((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as { status: string; is_online: boolean } | null
      return vendor?.status === 'APPROVED' && vendor?.is_online === true
    })
    .map((vp: { vendor_id: string }) => vp.vendor_id)

  // Method 2: Zone match
  const { data: zones } = await supabase
    .from('city_zones')
    .select('id')
    .contains('pincodes', [pincode])
    .eq('is_active', true)
    .eq('city_id', cityId)

  const zoneIds = (zones || []).map((z: { id: string }) => z.id)
  let zoneVendorIds: string[] = []
  if (zoneIds.length > 0) {
    const { data: vendorZones } = await supabase
      .from('vendor_zones')
      .select('vendor_id, vendors(status, is_online)')
      .in('zone_id', zoneIds)

    zoneVendorIds = (vendorZones || [])
      .filter((vz: Record<string, unknown>) => {
        const vendor = vz.vendors as { status: string; is_online: boolean } | null
        return vendor?.status === 'APPROVED' && vendor?.is_online === true
      })
      .map((vz: { vendor_id: string }) => vz.vendor_id)
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
        isServiceable: false,
        serviceable: false,
        comingSoon: true,
        message: "We're coming to your area soon!",
        vendorCount: 0,
        deliveryCharge: 0,
        availableSlots: [],
        cityName: city.name,
        cityId: city.id,
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
      .eq('product_id', productId)
      .eq('is_available', true)
      .in('vendor_id', allVendorIds)
      .limit(1)
      .maybeSingle()

    productAvailable = !!vendorProduct
  }

  const { data: slotCutoffs } = await supabase
    .from('city_slot_cutoff')
    .select('*')
    .eq('city_id', cityId)
    .eq('is_available', true)

  const availableSlots = await buildSlotsListWithFallback(slotCutoffs || [])
  const deliveryCharge = Number(city.base_delivery_charge)
  const freeDeliveryAbove = Number(city.free_delivery_above)

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

/** Build delivery slots list from city_slot_cutoff rows */
function buildSlotsList(
  slotCutoffs: Array<Record<string, unknown>>
) {
  return slotCutoffs.map((sc) => ({
    id: sc.slot_id as string,
    name: sc.slot_name as string,
    slug: sc.slot_slug as string,
    startTime: sc.slot_start as string,
    endTime: sc.slot_end as string,
    charge: Number(sc.base_charge),
  }))
}

/** Build delivery slots list with fallback to all active slots */
async function buildSlotsListWithFallback(
  slotCutoffs: Array<Record<string, unknown>>
) {
  if (slotCutoffs.length > 0) {
    return buildSlotsList(slotCutoffs)
  }

  const supabase = getSupabaseAdmin()
  const { data: allSlots } = await supabase
    .from('delivery_slots')
    .select('*')
    .eq('is_active', true)

  return (allSlots || []).map((slot: {
    id: string
    name: string
    slug: string
    start_time: string
    end_time: string
    base_charge: unknown
  }) => ({
    id: slot.id,
    name: slot.name,
    slug: slot.slug,
    startTime: slot.start_time,
    endTime: slot.end_time,
    charge: Number(slot.base_charge),
  }))
}

/** Get vendor IDs within delivery radius of given coordinates */
async function getRadiusVendorIds(
  coords: { lat: number; lng: number } | null,
): Promise<string[]> {
  if (!coords) return []

  const { lat, lng } = coords
  const supabase = getSupabaseAdmin()

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, lat, lng, delivery_radius_km')
    .eq('status', 'APPROVED')
    .eq('is_online', true)
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
