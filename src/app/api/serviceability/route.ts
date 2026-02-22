import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // ------- Path A: Pincode provided → lookup service_areas -------
    if (pincode) {
      const serviceArea = await prisma.serviceArea.findFirst({
        where: {
          pincode,
          isActive: true,
        },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              baseDeliveryCharge: true,
              freeDeliveryAbove: true,
            },
          },
        },
      })

      if (!serviceArea) {
        // No service_areas row → not serviceable
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
        serviceArea.cityId,
        serviceArea.city,
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

/** Handle lat/lng only — find nearest service area or do radius vendor match */
async function handleCoordinateSearch(
  lat: number,
  lng: number,
  productId?: string
) {
  // Try to find the nearest service area by coordinates
  const serviceAreas = await prisma.serviceArea.findMany({
    where: {
      isActive: true,
      lat: { not: null },
      lng: { not: null },
    },
    include: {
      city: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          baseDeliveryCharge: true,
          freeDeliveryAbove: true,
        },
      },
    },
  })

  // Find the closest service area within 15km
  let closestArea: (typeof serviceAreas)[number] | null = null
  let closestDist = Infinity

  for (const area of serviceAreas) {
    const aLat = Number(area.lat)
    const aLng = Number(area.lng)
    const dist = haversineKm(lat, lng, aLat, aLng)
    if (dist < closestDist && dist <= 15) {
      closestDist = dist
      closestArea = area
    }
  }

  if (closestArea) {
    // Found a nearby service area — use its pincode & city for full check
    return handleFullServiceability(
      closestArea.pincode,
      closestArea.cityId,
      closestArea.city,
      closestArea.name,
      lat, // use the provided coords for radius matching
      lng,
      productId
    )
  }

  // No nearby service area — do pure radius vendor match with provided coords
  const radiusVendorIds = await getRadiusVendorIds({ lat, lng })

  if (radiusVendorIds.length > 0) {
    // Vendors found by radius — get the first vendor's city for delivery config
    const vendorWithCity = await prisma.vendor.findFirst({
      where: { id: { in: radiusVendorIds } },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            baseDeliveryCharge: true,
            freeDeliveryAbove: true,
          },
        },
      },
    })

    if (vendorWithCity) {
      const deliveryConfigs = await prisma.cityDeliveryConfig.findMany({
        where: { cityId: vendorWithCity.cityId, isAvailable: true },
        include: { slot: true },
      })

      const availableSlots = buildSlotsList(deliveryConfigs)
      const deliveryCharge = Number(vendorWithCity.city.baseDeliveryCharge)
      const freeDeliveryAbove = Number(vendorWithCity.city.freeDeliveryAbove)

      let productAvailable = true
      if (productId) {
        const vendorProduct = await prisma.vendorProduct.findFirst({
          where: {
            productId,
            isAvailable: true,
            vendor: { status: 'APPROVED', id: { in: radiusVendorIds } },
          },
        })
        productAvailable = !!vendorProduct
      }

      return NextResponse.json({
        success: true,
        data: {
          isServiceable: true,
          serviceable: true,
          city: vendorWithCity.city,
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
  // Method 1: Pincode match
  const pincodeVendorIds = await prisma.vendorPincode.findMany({
    where: {
      pincode,
      isActive: true,
      vendor: { status: 'APPROVED' },
    },
    select: { vendorId: true },
  })

  // Method 2: Zone match
  const zones = await prisma.cityZone.findMany({
    where: {
      pincodes: { has: pincode },
      isActive: true,
      cityId,
    },
  })
  const zoneIds = zones.map((z) => z.id)
  const zoneVendorIds = zoneIds.length > 0
    ? await prisma.vendorZone.findMany({
        where: {
          zoneId: { in: zoneIds },
          vendor: { status: 'APPROVED' },
        },
        select: { vendorId: true },
      })
    : []

  // Method 3: Radius match
  const radiusVendorIds = await getRadiusVendorIds(
    lat !== null && lng !== null ? { lat, lng } : null
  )

  // Merge all vendor IDs (deduplicate)
  const allVendorIdSet = new Set<string>()
  for (const v of pincodeVendorIds) allVendorIdSet.add(v.vendorId)
  for (const v of zoneVendorIds) allVendorIdSet.add(v.vendorId)
  for (const id of radiusVendorIds) allVendorIdSet.add(id)

  const vendorCount = allVendorIdSet.size

  // No vendors but service_areas row exists → coming soon
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

  // Vendors found → full serviceable response
  let productAvailable = true
  if (productId) {
    const vendorProduct = await prisma.vendorProduct.findFirst({
      where: {
        productId,
        isAvailable: true,
        vendor: {
          status: 'APPROVED',
          id: { in: Array.from(allVendorIdSet) },
        },
      },
    })
    productAvailable = !!vendorProduct
  }

  const deliveryConfigs = await prisma.cityDeliveryConfig.findMany({
    where: { cityId, isAvailable: true },
    include: { slot: true },
  })

  const availableSlots = buildSlotsList(deliveryConfigs)
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

/** Build delivery slots list from city configs, falling back to all active slots */
async function buildSlotsList(
  deliveryConfigs: Array<{
    slot: {
      id: string
      name: string
      slug: string
      startTime: string
      endTime: string
      isActive: boolean
      baseCharge: unknown
    }
    chargeOverride: unknown
  }>
) {
  if (deliveryConfigs.length > 0) {
    return deliveryConfigs
      .filter((dc) => dc.slot.isActive)
      .map((dc) => ({
        id: dc.slot.id,
        name: dc.slot.name,
        slug: dc.slot.slug,
        startTime: dc.slot.startTime,
        endTime: dc.slot.endTime,
        charge: Number(dc.chargeOverride ?? dc.slot.baseCharge),
      }))
  }

  const allSlots = await prisma.deliverySlot.findMany({
    where: { isActive: true },
  })
  return allSlots.map((slot) => ({
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

  const vendors = await prisma.vendor.findMany({
    where: {
      status: 'APPROVED',
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      id: true,
      lat: true,
      lng: true,
      deliveryRadiusKm: true,
    },
  })

  const matchedIds: string[] = []
  for (const vendor of vendors) {
    const vLat = Number(vendor.lat)
    const vLng = Number(vendor.lng)
    const radius = Number(vendor.deliveryRadiusKm)
    const distance = haversineKm(lat, lng, vLat, vLng)
    if (distance <= radius) {
      matchedIds.push(vendor.id)
    }
  }

  return matchedIds
}
