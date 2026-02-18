import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const serviceabilitySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)'),
  productId: z.string().optional(),
  citySlug: z.string().optional(),
})

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

    if (zones.length === 0) {
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

    // Find vendors serving this pincode
    const vendorCount = await prisma.vendorPincode.count({
      where: {
        pincode,
        isActive: true,
        vendor: { status: 'APPROVED' },
      },
    })

    // If a specific product is requested, check vendor availability
    let productAvailable = true
    if (productId) {
      const vendorProduct = await prisma.vendorProduct.findFirst({
        where: {
          productId,
          isAvailable: true,
          vendor: {
            status: 'APPROVED',
            pincodes: { some: { pincode, isActive: true } },
          },
        },
      })
      productAvailable = !!vendorProduct
    }

    // Get available delivery slots for this city
    const deliveryConfigs = await prisma.cityDeliveryConfig.findMany({
      where: {
        cityId: zone.city.id,
        isAvailable: true,
      },
      include: {
        slot: true,
      },
    })

    // If no city delivery configs, fall back to all active delivery slots
    let availableSlots
    if (deliveryConfigs.length > 0) {
      availableSlots = deliveryConfigs
        .filter((dc) => dc.slot.isActive)
        .map((dc) => ({
          id: dc.slot.id,
          name: dc.slot.name,
          slug: dc.slot.slug,
          startTime: dc.slot.startTime,
          endTime: dc.slot.endTime,
          charge: Number(dc.chargeOverride ?? dc.slot.baseCharge),
        }))
    } else {
      const allSlots = await prisma.deliverySlot.findMany({
        where: { isActive: true },
      })
      availableSlots = allSlots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        slug: slot.slug,
        startTime: slot.startTime,
        endTime: slot.endTime,
        charge: Number(slot.baseCharge),
      }))
    }

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
