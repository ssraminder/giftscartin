import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = (body.query || '').trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Exact 6-digit pincode
    if (/^\d{6}$/.test(query)) {
      const pin = await prisma.pincodeCityMap.findUnique({
        where: { pincode: query },
        include: { city: true },
      })
      if (pin) {
        return NextResponse.json({
          success: true,
          data: [{
            cityId: pin.city.id,
            cityName: pin.city.name,
            citySlug: pin.city.slug,
            pincode: pin.pincode,
            areaName: pin.areaName,
            isActive: pin.city.isActive,
            isComingSoon: pin.city.isComingSoon,
          }],
        })
      }
      return NextResponse.json({ success: true, data: [] })
    }

    // Partial pincode (2-5 digits)
    if (/^\d{2,5}$/.test(query)) {
      const pins = await prisma.pincodeCityMap.findMany({
        where: { pincode: { startsWith: query }, isActive: true },
        include: { city: true },
        take: 8,
      })
      const seen = new Set<string>()
      const data = pins
        .filter(p => {
          if (seen.has(p.city.id)) return false
          seen.add(p.city.id)
          return true
        })
        .map(p => ({
          cityId: p.city.id,
          cityName: p.city.name,
          citySlug: p.city.slug,
          pincode: p.pincode,
          areaName: p.areaName,
          isActive: p.city.isActive,
          isComingSoon: p.city.isComingSoon,
        }))
      return NextResponse.json({ success: true, data })
    }

    // City name text search
    const cities = await prisma.city.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 8,
      orderBy: { name: 'asc' },
    })

    const data = cities.map(c => ({
      cityId: c.id,
      cityName: c.name,
      citySlug: c.slug,
      pincode: null,
      areaName: null,
      isActive: c.isActive,
      isComingSoon: c.isComingSoon,
    }))

    return NextResponse.json({ success: true, data })

  } catch (err) {
    console.error('[city/resolve] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
