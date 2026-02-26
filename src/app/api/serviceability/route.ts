export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod/v4'
import { getPlatformSurcharges, calculatePlatformSurcharge, type SurchargeResult } from '@/lib/surcharge'
import type { SlotGroup, FixedSlotGroup, MidnightSlotGroup, ExpressSlot } from '@/types'

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

// ==================== Slot Group Helpers ====================

interface CitySlotCutoffRow {
  id: string
  city_id: string
  slot_id: string
  slot_name: string
  slot_slug: string
  slot_start: string
  slot_end: string
  cutoff_hours: number
  base_charge: unknown
  is_available: boolean
  slot_group: string | null
  updated_at: string | null
}

function calculateTotalCharge(
  slotBaseCharge: number,
  slotGroup: string,
  vendorAreaSurcharge: number,
  platformSurcharges: SurchargeResult[]
): number {
  // Sum of 'all' type platform surcharges
  const allSurchargeTotal = platformSurcharges
    .filter((s) => s.appliesTo === 'all')
    .reduce((sum, s) => sum + s.amount, 0)

  // Sum of slot-specific platform surcharges
  const slotSurchargeTotal = platformSurcharges
    .filter((s) => s.appliesTo === `slot:${slotGroup}`)
    .reduce((sum, s) => sum + s.amount, 0)

  return slotBaseCharge + vendorAreaSurcharge + allSurchargeTotal + slotSurchargeTotal
}

function buildSlotGroupsResponse(
  allSlotCutoffs: CitySlotCutoffRow[],
  vendorAreaSurcharge: number,
  platformSurcharges: SurchargeResult[]
): {
  slotGroups: { standard: SlotGroup | null; fixed: FixedSlotGroup | null; midnight: MidnightSlotGroup | null }
  expressSlot: ExpressSlot | null
} {
  // Group rows by slot_group
  const standardRows = allSlotCutoffs.filter((r) => r.slot_group === 'standard')
  const fixedRows = allSlotCutoffs.filter((r) => r.slot_group === 'fixed')
  const midnightRows = allSlotCutoffs.filter((r) => r.slot_group === 'midnight')
  const expressRows = allSlotCutoffs.filter((r) => r.slot_group === 'express')

  // Standard slot group
  const availableStandard = standardRows.find((r) => r.is_available)
  const standard: SlotGroup | null = availableStandard
    ? {
        available: true,
        label: 'Standard Delivery',
        description: '9 AM – 9 PM, any time',
        baseCharge: Number(availableStandard.base_charge),
        cutoffHours: availableStandard.cutoff_hours,
        totalCharge: calculateTotalCharge(
          Number(availableStandard.base_charge),
          'standard',
          vendorAreaSurcharge,
          platformSurcharges
        ),
      }
    : null

  // Fixed slot group
  const availableFixed = fixedRows.filter((r) => r.is_available)
  const fixed: FixedSlotGroup | null = availableFixed.length > 0
    ? {
        available: true,
        label: 'Specific Time Slot',
        description: 'Choose a 2-hour delivery window',
        baseCharge: Number(availableFixed[0].base_charge),
        cutoffHours: availableFixed[0].cutoff_hours,
        totalCharge: calculateTotalCharge(
          Number(availableFixed[0].base_charge),
          'fixed',
          vendorAreaSurcharge,
          platformSurcharges
        ),
        slots: availableFixed.map((row) => ({
          id: row.slot_id,
          name: row.slot_name,
          slug: row.slot_slug,
          startTime: row.slot_start,
          endTime: row.slot_end,
          baseCharge: Number(row.base_charge),
          cutoffHours: row.cutoff_hours,
          totalCharge: calculateTotalCharge(
            Number(row.base_charge),
            'fixed',
            vendorAreaSurcharge,
            platformSurcharges
          ),
        })),
      }
    : null

  // Midnight slot group
  const availableMidnight = midnightRows.find((r) => r.is_available)
  const midnight: MidnightSlotGroup | null = availableMidnight
    ? {
        available: true,
        label: 'Midnight Delivery',
        description: '11 PM – 12 AM',
        baseCharge: Number(availableMidnight.base_charge),
        cutoffHours: availableMidnight.cutoff_hours,
        cutoffTime: deriveCutoffTime(availableMidnight.cutoff_hours),
        totalCharge: calculateTotalCharge(
          Number(availableMidnight.base_charge),
          'midnight',
          vendorAreaSurcharge,
          platformSurcharges
        ),
      }
    : null

  // Express slot — always return if row exists (even if not available)
  const expressRow = expressRows[0] || null
  const expressSlot: ExpressSlot | null = expressRow
    ? {
        available: expressRow.is_available,
        baseCharge: Number(expressRow.base_charge),
        cutoffHours: expressRow.cutoff_hours,
        totalCharge: calculateTotalCharge(
          Number(expressRow.base_charge),
          'express',
          vendorAreaSurcharge,
          platformSurcharges
        ),
      }
    : null

  return {
    slotGroups: { standard, fixed, midnight },
    expressSlot,
  }
}

/** Derive cutoff time string from cutoff_hours before midnight (24:00).
 *  e.g. cutoff_hours=6 → "18:00"
 */
function deriveCutoffTime(cutoffHours: number): string {
  const hour = 24 - cutoffHours
  return `${hour.toString().padStart(2, '0')}:00`
}

function buildPlatformSurchargeBreakdown(
  platformSurcharges: SurchargeResult[]
): { name: string; amount: number; appliesTo: string }[] {
  return platformSurcharges.map((s) => ({
    name: s.name,
    amount: s.amount,
    appliesTo: s.appliesTo,
  }))
}

function calculatePlatformSurchargeTotal(platformSurcharges: SurchargeResult[]): number {
  return platformSurcharges
    .filter((s) => s.appliesTo === 'all')
    .reduce((sum, s) => sum + s.amount, 0)
}

// ==================== Main Handler ====================

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

      // service_areas uses @map: city_id, is_active, created_at
      // cities: isActive, baseDeliveryCharge, freeDeliveryAbove are camelCase (no @map)
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
  // service_areas: is_active has @map; cities columns are camelCase (no @map)
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
    // service_areas.city_id has @map → snake_case is correct
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
    // vendors: cityId is camelCase (no @map); cities columns are camelCase
    const { data: vendorWithCity } = await supabase
      .from('vendors')
      .select('id, cityId, cities(id, name, slug, isActive, baseDeliveryCharge, freeDeliveryAbove)')
      .in('id', radiusVendorIds)
      .limit(1)
      .single()

    if (vendorWithCity) {
      const city = vendorWithCity.cities as unknown as { id: string; name: string; slug: string; isActive: boolean; baseDeliveryCharge: unknown; freeDeliveryAbove: unknown }

      // city_slot_cutoff: city_id and is_available have @map → snake_case correct
      // Fetch ALL rows (not just is_available=true) for slot group building
      const { data: allSlotCutoffs } = await supabase
        .from('city_slot_cutoff')
        .select('*')
        .eq('city_id', vendorWithCity.cityId)
        .order('slot_group')
        .order('slot_start')

      const slotCutoffRows = (allSlotCutoffs || []) as CitySlotCutoffRow[]

      // Build flat slots list (only available ones — backward compat)
      const availableSlotCutoffs = slotCutoffRows.filter((r) => r.is_available)
      const availableSlots = buildSlotsList(availableSlotCutoffs as unknown as Array<Record<string, unknown>>)
      const deliveryCharge = Number(city.baseDeliveryCharge)
      const freeDeliveryAbove = Number(city.freeDeliveryAbove)

      let productAvailable = true
      if (productId) {
        // vendor_products: productId, isAvailable, vendorId are camelCase (no @map)
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

      // Enrich slots with surcharges (vendorAreaSurcharge = 0 for radius path)
      const vendorAreaSurcharge = 0
      const today = new Date()
      const platformSurcharges = await getPlatformSurcharges(today, vendorWithCity.cityId)
      const enrichedSlots = enrichSlotsWithSurcharges(availableSlots, vendorAreaSurcharge, platformSurcharges)

      // Build grouped response
      const { slotGroups, expressSlot } = buildSlotGroupsResponse(
        slotCutoffRows,
        vendorAreaSurcharge,
        platformSurcharges
      )

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
          availableSlots: enrichedSlots,
          deliverySlots: enrichedSlots,
          vendorAreaSurcharge,
          platformSurchargeTotal: calculatePlatformSurchargeTotal(platformSurcharges),
          platformSurchargeBreakdown: buildPlatformSurchargeBreakdown(platformSurcharges),
          slotGroups,
          expressSlot,
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

/** Enrich base slots with surcharge breakdown */
function enrichSlotsWithSurcharges(
  slots: Array<{ id: string; name: string; slug: string; startTime: string; endTime: string; charge: number }>,
  vendorAreaSurcharge: number,
  platformSurcharges: SurchargeResult[]
) {
  return slots.map((slot) => {
    const platformResult = calculatePlatformSurcharge(platformSurcharges, slot.slug, [])
    const totalSurcharge = vendorAreaSurcharge + platformResult.total
    const baseCharge = slot.charge
    const totalCharge = baseCharge + totalSurcharge

    return {
      ...slot,
      vendorAreaSurcharge,
      platformSurcharges: platformResult,
      totalSurcharge,
      baseCharge,
      totalCharge,
    }
  })
}

/** Full serviceability check: vendor_service_areas + vendor_pincodes fallback + radius fallback */
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

  // Primary method: vendor_service_areas matching by pincode
  // Look up service_area IDs for this pincode, then find vendors with active coverage
  const { data: matchingServiceAreas } = await supabase
    .from('service_areas')
    .select('id')
    .eq('pincode', pincode)
    .eq('is_active', true)

  const serviceAreaIds = (matchingServiceAreas || []).map((sa: { id: string }) => sa.id)

  let vsaVendorIds: string[] = []
  let minSurcharge = 0

  if (serviceAreaIds.length > 0) {
    const { data: vsaRows } = await supabase
      .from('vendor_service_areas')
      .select('vendor_id, delivery_surcharge, vendors(id, status, isOnline)')
      .in('service_area_id', serviceAreaIds)
      .eq('status', 'ACTIVE')
      .eq('is_active', true)

    const validRows = (vsaRows || []).filter((row: Record<string, unknown>) => {
      const vendor = row.vendors as { id: string; status: string; isOnline: boolean } | null
      return vendor?.status === 'APPROVED' && vendor?.isOnline === true
    })

    vsaVendorIds = validRows.map((row: { vendor_id: string }) => row.vendor_id)

    // Get minimum surcharge across matching vendors (most favorable to customer)
    const surcharges = validRows
      .map((row: { delivery_surcharge: unknown }) => Number(row.delivery_surcharge))
      .filter((s: number) => s > 0)
    if (surcharges.length > 0) {
      minSurcharge = Math.min(...surcharges)
    }
  }

  // Fallback: vendor_pincodes (legacy pincode-based coverage)
  // vendorAreaSurcharge = 0 for vendors found via this path
  let pinVendorIds: string[] = []
  {
    const { data: pinRows } = await supabase
      .from('vendor_pincodes')
      .select('vendorId, vendors(id, status, isOnline)')
      .eq('pincode', pincode)
      .eq('isActive', true)

    const validPinRows = (pinRows || []).filter((row: Record<string, unknown>) => {
      const vendor = row.vendors as { id: string; status: string; isOnline: boolean } | null
      return vendor?.status === 'APPROVED' && vendor?.isOnline === true
    })

    pinVendorIds = validPinRows.map((row: Record<string, unknown>) => row.vendorId as string)
  }

  // Fallback: Radius match (vendors within delivery radius of coordinates)
  const radiusVendorIds = await getRadiusVendorIds(
    lat !== null && lng !== null ? { lat, lng } : null
  )

  // Merge all vendor IDs (deduplicate)
  const allVendorIdSet = new Set<string>()
  for (const id of vsaVendorIds) allVendorIdSet.add(id)
  for (const id of pinVendorIds) allVendorIdSet.add(id)
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
      .eq('productId', productId)
      .eq('isAvailable', true)
      .in('vendorId', allVendorIds)
      .limit(1)
      .maybeSingle()

    productAvailable = !!vendorProduct
  }

  // Fetch ALL city_slot_cutoff rows (not just available) for grouped response
  const { data: allSlotCutoffs } = await supabase
    .from('city_slot_cutoff')
    .select('*')
    .eq('city_id', cityId)
    .order('slot_group')
    .order('slot_start')

  const slotCutoffRows = (allSlotCutoffs || []) as CitySlotCutoffRow[]

  // Build flat slots (only available — backward compat)
  const availableSlotCutoffs = slotCutoffRows.filter((r) => r.is_available)
  const availableSlots = await buildSlotsListWithFallback(availableSlotCutoffs as unknown as Array<Record<string, unknown>>)
  const deliveryCharge = Number(city.baseDeliveryCharge)
  const freeDeliveryAbove = Number(city.freeDeliveryAbove)

  // Fetch platform surcharges and enrich slots
  const vendorAreaSurcharge = minSurcharge
  const today = new Date()
  const platformSurcharges = await getPlatformSurcharges(today, cityId)
  const enrichedSlots = enrichSlotsWithSurcharges(availableSlots, vendorAreaSurcharge, platformSurcharges)

  // Build grouped response
  const { slotGroups, expressSlot } = buildSlotGroupsResponse(
    slotCutoffRows,
    vendorAreaSurcharge,
    platformSurcharges
  )

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
      extraDeliveryCharge: minSurcharge,
      freeDeliveryAbove,
      availableSlots: enrichedSlots,
      deliverySlots: enrichedSlots,
      vendorAreaSurcharge,
      platformSurchargeTotal: calculatePlatformSurchargeTotal(platformSurcharges),
      platformSurchargeBreakdown: buildPlatformSurchargeBreakdown(platformSurcharges),
      slotGroups,
      expressSlot,
    },
  })
}

/** Build delivery slots list from city_slot_cutoff rows */
function buildSlotsList(
  slotCutoffs: Array<Record<string, unknown>>
) {
  // city_slot_cutoff columns all have @map → snake_case correct
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
  // delivery_slots: isActive, startTime, endTime, baseCharge are camelCase (no @map)
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

  // vendors: isOnline is camelCase (no @map), delivery_radius_km has @map
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, lat, lng, delivery_radius_km')
    .eq('status', 'APPROVED')
    .eq('isOnline', true)
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
