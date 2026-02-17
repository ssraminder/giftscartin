import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serviceabilitySchema } from '@/lib/validations'

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

    const { pincode, productId } = parsed.data

    // Find zones that service this pincode
    const zones = await prisma.cityZone.findMany({
      where: {
        pincodes: { has: pincode },
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

    if (zones.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          serviceable: false,
          message: 'Sorry, we do not deliver to this pincode yet.',
        },
      })
    }

    const activeZones = zones.filter((z) => z.city.isActive)
    if (activeZones.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          serviceable: false,
          message: 'Delivery to this area is temporarily unavailable.',
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

    const availableSlots = deliveryConfigs
      .filter((dc) => dc.slot.isActive)
      .map((dc) => ({
        id: dc.slot.id,
        name: dc.slot.name,
        slug: dc.slot.slug,
        startTime: dc.slot.startTime,
        endTime: dc.slot.endTime,
        charge: dc.chargeOverride ?? dc.slot.baseCharge,
      }))

    return NextResponse.json({
      success: true,
      data: {
        serviceable: true,
        city: zone.city,
        zone: {
          id: zone.id,
          name: zone.name,
          extraCharge: zone.extraCharge,
        },
        vendorCount,
        productAvailable,
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
