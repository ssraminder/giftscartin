import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const serviceabilitySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)'),
  productId: z.string().optional(),
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

    const { pincode, productId } = parsed.data

    // Step 1: Resolve city from pincode via service_areas
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

    // Step 3a: No service_areas row → not serviceable
    if (!serviceArea) {
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

    const cityId = serviceArea.cityId

    // Step 2: Find capable vendors in this city serving this pincode
    const vendorWhere = {
      cityId,
      status: 'APPROVED' as const,
      isOnline: true,
      pincodes: { some: { pincode, isActive: true } },
      ...(productId
        ? { products: { some: { productId, isAvailable: true } } }
        : {}),
    }

    const vendors = await prisma.vendor.findMany({
      where: vendorWhere,
      select: { id: true },
    })

    const vendorCount = vendors.length

    // Step 3b: No vendors but service_areas row exists → coming soon
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
          cityName: serviceArea.city.name,
          areaName: serviceArea.name,
          freeDeliveryAbove: 0,
        },
      })
    }

    // Step 3c: Vendors found → full serviceable response

    // Get available delivery slots for this city
    const deliveryConfigs = await prisma.cityDeliveryConfig.findMany({
      where: {
        cityId,
        isAvailable: true,
      },
      include: {
        slot: true,
      },
    })

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

    const deliveryCharge = Number(serviceArea.city.baseDeliveryCharge)
    const freeDeliveryAbove = Number(serviceArea.city.freeDeliveryAbove)

    return NextResponse.json({
      success: true,
      data: {
        isServiceable: true,
        serviceable: true,
        city: serviceArea.city,
        areaName: serviceArea.name,
        vendorCount,
        productAvailable: true,
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
