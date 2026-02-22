import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lookupPincode } from '@/lib/nominatim'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const pincode = request.nextUrl.searchParams.get('pincode')

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { success: false, error: 'Valid 6-digit pincode required' },
      { status: 400 }
    )
  }

  try {
    // Step 1: check our service_areas table
    const [area, vendorCount] = await Promise.all([
      prisma.serviceArea.findFirst({
        where: { pincode, isActive: true },
        select: {
          cityId: true, cityName: true, state: true, name: true,
          lat: true, lng: true,
        },
      }),
      prisma.vendorPincode.count({
        where: {
          pincode,
          isActive: true,
          vendor: { status: 'APPROVED' },
        },
      }),
    ])

    if (area) {
      return NextResponse.json({
        success: true,
        data: {
          pincode,
          found: true,
          isServiceable: true,
          hasVendor: vendorCount > 0,
          cityId: area.cityId,
          cityName: area.cityName,
          state: area.state,
          areaName: area.name,
          vendorCount,
          source: 'database',
        },
      })
    }

    // Step 2: fallback to Nominatim
    const nominatim = await lookupPincode(pincode)

    if (!nominatim) {
      return NextResponse.json({
        success: true,
        data: {
          pincode,
          found: false,
          isServiceable: false,
          cityId: null,
          cityName: null,
          state: null,
          vendorCount: 0,
          source: 'not_found',
        },
      })
    }

    // Step 3: Nominatim found it — check if city matches one of ours
    const matchingCity = await prisma.city.findFirst({
      where: {
        OR: [
          { name: { contains: nominatim.city, mode: 'insensitive' } },
          { slug: nominatim.city.toLowerCase().replace(/\s+/g, '-') },
        ],
      },
    })

    if (matchingCity) {
      // Known city, unknown area — add to service_areas as inactive
      await prisma.serviceArea.create({
        data: {
          name: nominatim.areaName || `Area ${pincode}`,
          pincode,
          cityId: matchingCity.id,
          cityName: matchingCity.name,
          state: nominatim.state,
          lat: nominatim.lat,
          lng: nominatim.lng,
          isActive: false,
        },
      }).catch(() => {}) // ignore if already exists (race condition)

      return NextResponse.json({
        success: true,
        data: {
          pincode,
          found: true,
          isServiceable: true,
          hasVendor: false,
          cityId: matchingCity.id,
          cityName: matchingCity.name,
          state: nominatim.state,
          areaName: nominatim.areaName,
          vendorCount: 0,
          source: 'nominatim',
          pendingReview: true,
        },
      })
    }

    // Unknown city entirely — not serviceable yet
    return NextResponse.json({
      success: true,
      data: {
        pincode,
        found: true,
        isServiceable: false,
        hasVendor: false,
        cityId: null,
        cityName: nominatim.city,
        state: nominatim.state,
        areaName: nominatim.areaName,
        vendorCount: 0,
        source: 'nominatim_unknown_city',
      },
    })
  } catch (error) {
    console.error('Pincode lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to look up pincode' },
      { status: 500 }
    )
  }
}
