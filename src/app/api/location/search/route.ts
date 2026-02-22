import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { areas: [], cities: [] } })
    }

    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }

    const isDigits = /^\d+$/.test(q)

    // Pincode search — query service_areas by pincode
    if (isDigits) {
      const areas = await prisma.serviceArea.findMany({
        where: {
          pincode: { startsWith: q },
          isActive: true,
        },
        include: { city: true },
        take: 8,
        orderBy: { pincode: 'asc' },
      })

      return NextResponse.json({
        success: true,
        data: {
          areas: areas.map(a => ({
            id: a.id,
            name: a.name,
            pincode: a.pincode,
            cityId: a.city.id,
            cityName: a.city.name,
            citySlug: a.city.slug,
            state: a.state,
            isActive: a.city.isActive,
            isComingSoon: a.city.isComingSoon,
          })),
          cities: [],
        },
      }, { headers: cacheHeaders })
    }

    // Text search — search both service_areas by name and cities by name
    const [areas, cities] = await Promise.all([
      prisma.serviceArea.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          isActive: true,
        },
        include: { city: true },
        take: 5,
        orderBy: { name: 'asc' },
      }),
      prisma.city.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 3,
        orderBy: { name: 'asc' },
      }),
    ])

    // Trim to 8 total: prioritize areas, then fill with cities
    const areaResults = areas.slice(0, Math.min(areas.length, 5)).map(a => ({
      id: a.id,
      name: a.name,
      pincode: a.pincode,
      cityId: a.city.id,
      cityName: a.city.name,
      citySlug: a.city.slug,
      state: a.state,
      isActive: a.city.isActive,
      isComingSoon: a.city.isComingSoon,
    }))

    const remaining = 8 - areaResults.length
    const cityResults = cities.slice(0, remaining).map(c => ({
      cityId: c.id,
      cityName: c.name,
      citySlug: c.slug,
      state: c.state,
      isActive: c.isActive,
      isComingSoon: c.isComingSoon,
    }))

    return NextResponse.json({
      success: true,
      data: {
        areas: areaResults,
        cities: cityResults,
      },
    }, { headers: cacheHeaders })

  } catch (err) {
    console.error('[location/search] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
