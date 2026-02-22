import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: preview which areas a radius covers (no save)
export async function GET(
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

    // Validate vendor exists
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

    const radius = parseFloat(request.nextUrl.searchParams.get('radius') || '8')
    const lat = parseFloat(request.nextUrl.searchParams.get('lat') || '0')
    const lng = parseFloat(request.nextUrl.searchParams.get('lng') || '0')

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'lat/lng required' },
        { status: 400 }
      )
    }

    const areas = await prisma.$queryRaw<{ name: string; pincode: string }[]>`
      SELECT name, pincode
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
        ) <= ${radius}
      ORDER BY name
    `

    return NextResponse.json({
      success: true,
      data: {
        count: areas.length,
        pincodes: Array.from(new Set(areas.map(a => a.pincode))),
        areas: areas.map(a => a.name),
      },
    })
  } catch (error) {
    console.error('Coverage preview error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to preview coverage' },
      { status: 500 }
    )
  }
}
