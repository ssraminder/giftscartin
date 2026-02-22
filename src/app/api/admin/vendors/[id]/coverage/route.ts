import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT: save vendor coverage (replaces all vendor_pincodes)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user?.role ||
      !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(session.user.role)
    ) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { method, pincodes, radiusKm, lat, lng } = body

    let finalPincodes: string[] = []

    if (method === 'pincode') {
      finalPincodes = pincodes || []
    } else if (method === 'radius' && lat && lng && radiusKm) {
      // Find all service_areas within radius using Haversine
      const areas = await prisma.$queryRaw<{ pincode: string }[]>`
        SELECT DISTINCT pincode
        FROM service_areas
        WHERE is_active = true
          AND (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${lat})) * cos(radians(lat::float)) *
                cos(radians(lng::float) - radians(${lng})) +
                sin(radians(${lat})) * sin(radians(lat::float))
              ))
            )
          ) <= ${radiusKm}
      `
      finalPincodes = areas.map(a => a.pincode)
    }

    // Get vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Replace all vendor_pincodes in a transaction
    await prisma.$transaction([
      prisma.vendorPincode.deleteMany({ where: { vendorId: params.id } }),
      prisma.vendorPincode.createMany({
        data: finalPincodes.map(pincode => ({
          vendorId: params.id,
          pincode,
          deliveryCharge: 0,
          isActive: true,
        })),
      }),
      prisma.vendor.update({
        where: { id: params.id },
        data: {
          coverageMethod: method,
          ...(method === 'radius' && { coverageRadiusKm: radiusKm }),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { pincodeCount: finalPincodes.length },
    })
  } catch (error) {
    console.error('Vendor coverage update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update coverage' },
      { status: 500 }
    )
  }
}
