import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const serviceabilitySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)'),
  productId: z.string().optional(),
  citySlug: z.string().optional(),
})

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

    const { pincode, productId, citySlug } = parsed.data

    // Find zones that service this pincode
    const zones = await prisma.cityZone.findMany({
      where: {
        pincodes: { has: pincode },
        isActive: true,
        ...(citySlug ? { city: { slug: citySlug } } : {}),
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

    // Look up service area for this pincode (used for radius fallback + coming soon)
    const serviceArea = await prisma.serviceArea.findFirst({
      where: {
        pincode,
        isActive: true,
      },
    })

    if (zones.length === 0) {
      // No zone coverage — check if any vendor can deliver via radius
      const radiusVendorCount = await countRadiusVendors(pincode, serviceArea, citySlug)

      if (radiusVendorCount > 0 && serviceArea) {
        // Vendor reachable by radius — get city info and slots from service area's city
        const city = await prisma.city.findFirst({
          where: { id: serviceArea.cityId, isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            baseDeliveryCharge: true,
            freeDeliveryAbove: true,
          },
        })

        if (city) {
          let productAvailable = true
          if (productId) {
            productAvailable = await checkProductAvailableByRadius(productId, pincode, serviceArea)
          }

          const availableSlots = await getSlotsForCity(city.id)

          return NextResponse.json({
            success: true,
            data: {
              isServiceable: true,
              serviceable: true,
              city,
              zone: null,
              vendorCount: radiusVendorCount,
              productAvailable,
              deliveryCharge: Number(city.baseDeliveryCharge),
              freeDeliveryAbove: Number(city.freeDeliveryAbove),
              availableSlots,
              deliverySlots: availableSlots,
            },
          })
        }
      }

      // No vendor via radius either — check coming soon
      if (serviceArea) {
        return NextResponse.json({
          success: true,
          data: {
            isServiceable: true,
            serviceable: true,
            comingSoon: true,
            message: "We're coming to your area soon! Place your order and our team will confirm delivery.",
            vendorCount: 0,
            deliveryCharge: 0,
            availableSlots: [],
            cityName: serviceArea.cityName,
            freeDeliveryAbove: 0,
          },
        })
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

    const activeZones = zones.filter((z) => z.city.isActive)
    if (activeZones.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          isServiceable: false,
          serviceable: false,
          message: 'Delivery to this area is temporarily unavailable.',
          vendorCount: 0,
          deliveryCharge: 0,
          availableSlots: [],
          freeDeliveryAbove: 0,
        },
      })
    }

    const zone = activeZones[0]

    // Count vendors via all three methods (any match = serviceable)
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
    const zoneIds = activeZones.map((z) => z.id)
    const zoneVendorIds = await prisma.vendorZone.findMany({
      where: {
        zoneId: { in: zoneIds },
        vendor: { status: 'APPROVED' },
      },
      select: { vendorId: true },
    })

    // Method 3: Radius match (universal fallback)
    const radiusVendorIds = await getRadiusVendorIds(pincode, serviceArea, citySlug)

    // Merge all vendor IDs (deduplicate)
    const allVendorIdSet = new Set<string>()
    for (const v of pincodeVendorIds) allVendorIdSet.add(v.vendorId)
    for (const v of zoneVendorIds) allVendorIdSet.add(v.vendorId)
    for (const id of radiusVendorIds) allVendorIdSet.add(id)

    const vendorCount = allVendorIdSet.size

    // If a specific product is requested, check vendor availability
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

    // Get available delivery slots for this city
    const availableSlots = await getSlotsForCity(zone.city.id)

    const baseCharge = Number(zone.city.baseDeliveryCharge)
    const zoneExtra = Number(zone.extraCharge)
    const deliveryCharge = baseCharge + zoneExtra
    const freeDeliveryAbove = Number(zone.city.freeDeliveryAbove)

    return NextResponse.json({
      success: true,
      data: {
        isServiceable: true,
        serviceable: true,
        city: zone.city,
        zone: {
          id: zone.id,
          name: zone.name,
          extraCharge: Number(zone.extraCharge),
        },
        vendorCount,
        productAvailable,
        deliveryCharge,
        freeDeliveryAbove,
        availableSlots,
        deliverySlots: availableSlots,
      },
    })
  } catch (error) {
    console.error('POST /api/serviceability error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check serviceability' },
      { status: 500 }
    )
  }
}

/** Get delivery slots for a city, falling back to all active slots */
async function getSlotsForCity(cityId: string) {
  const deliveryConfigs = await prisma.cityDeliveryConfig.findMany({
    where: {
      cityId,
      isAvailable: true,
    },
    include: {
      slot: true,
    },
  })

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

/** Get vendor IDs within delivery radius of a pincode's service area coordinates */
async function getRadiusVendorIds(
  pincode: string,
  serviceArea: { lat: unknown; lng: unknown } | null,
  citySlug?: string
): Promise<string[]> {
  const areaLat = serviceArea?.lat ? Number(serviceArea.lat) : null
  const areaLng = serviceArea?.lng ? Number(serviceArea.lng) : null

  if (areaLat === null || areaLng === null) return []

  // Fetch all approved vendors with coordinates
  const vendors = await prisma.vendor.findMany({
    where: {
      status: 'APPROVED',
      lat: { not: null },
      lng: { not: null },
      ...(citySlug ? { city: { slug: citySlug } } : {}),
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
    const distance = haversineKm(areaLat, areaLng, vLat, vLng)
    if (distance <= radius) {
      matchedIds.push(vendor.id)
    }
  }

  return matchedIds
}

/** Count vendors reachable by radius only (used when no zone coverage) */
async function countRadiusVendors(
  pincode: string,
  serviceArea: { lat: unknown; lng: unknown } | null,
  citySlug?: string
): Promise<number> {
  const ids = await getRadiusVendorIds(pincode, serviceArea, citySlug)
  return ids.length
}

/** Check if a product is available from any vendor within radius */
async function checkProductAvailableByRadius(
  productId: string,
  pincode: string,
  serviceArea: { lat: unknown; lng: unknown } | null
): Promise<boolean> {
  const radiusIds = await getRadiusVendorIds(pincode, serviceArea)
  if (radiusIds.length === 0) return false

  const vendorProduct = await prisma.vendorProduct.findFirst({
    where: {
      productId,
      isAvailable: true,
      vendor: {
        status: 'APPROVED',
        id: { in: radiusIds },
      },
    },
  })
  return !!vendorProduct
}
