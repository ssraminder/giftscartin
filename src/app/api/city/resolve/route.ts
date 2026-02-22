import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = (body.query || '').trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }

    // Exact 6-digit pincode
    if (/^\d{6}$/.test(query)) {
      // Layer 1: service_areas (primary source, always seeded)
      const area = await prisma.serviceArea.findFirst({
        where: { pincode: query, isActive: true },
        include: { city: true },
      })
      if (area) {
        return NextResponse.json({
          success: true,
          data: [{
            cityId: area.city.id,
            cityName: area.city.name,
            citySlug: area.city.slug,
            pincode: area.pincode,
            areaName: area.name,
            isActive: area.city.isActive,
            isComingSoon: area.city.isComingSoon,
          }],
        }, { headers: cacheHeaders })
      }

      // Layer 2: pincode_city_map
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
        }, { headers: cacheHeaders })
      }

      // Layer 3: city_zones (pincodes[] array)
      const zone = await prisma.cityZone.findFirst({
        where: { pincodes: { has: query }, isActive: true },
        include: { city: true },
      })
      if (zone) {
        return NextResponse.json({
          success: true,
          data: [{
            cityId: zone.city.id,
            cityName: zone.city.name,
            citySlug: zone.city.slug,
            pincode: query,
            areaName: zone.name,
            isActive: zone.city.isActive,
            isComingSoon: zone.city.isComingSoon,
          }],
        }, { headers: cacheHeaders })
      }

      // Layer 4: cities.pincodePrefixes
      const prefix = query.slice(0, 3)
      const prefixCity = await prisma.city.findFirst({
        where: { pincodePrefixes: { has: prefix } },
      })
      if (prefixCity) {
        return NextResponse.json({
          success: true,
          data: [{
            cityId: prefixCity.id,
            cityName: prefixCity.name,
            citySlug: prefixCity.slug,
            pincode: query,
            areaName: null,
            isActive: prefixCity.isActive,
            isComingSoon: prefixCity.isComingSoon,
          }],
        }, { headers: cacheHeaders })
      }

      return NextResponse.json({ success: true, data: [] }, { headers: cacheHeaders })
    }

    // Partial pincode (2-5 digits)
    if (/^\d{2,5}$/.test(query)) {
      // Try service_areas first
      const areas = await prisma.serviceArea.findMany({
        where: { pincode: { startsWith: query }, isActive: true },
        include: { city: true },
        take: 8,
      })

      if (areas.length > 0) {
        const seen = new Set<string>()
        const data = areas
          .filter(a => {
            if (seen.has(a.city.id)) return false
            seen.add(a.city.id)
            return true
          })
          .map(a => ({
            cityId: a.city.id,
            cityName: a.city.name,
            citySlug: a.city.slug,
            pincode: a.pincode,
            areaName: a.name,
            isActive: a.city.isActive,
            isComingSoon: a.city.isComingSoon,
          }))
        return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
      }

      // Fallback: pincode_city_map
      const pins = await prisma.pincodeCityMap.findMany({
        where: { pincode: { startsWith: query }, isActive: true },
        include: { city: true },
        take: 8,
      })

      if (pins.length > 0) {
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
        return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
      }

      // Fallback: cities.pincodePrefixes
      const matchingCities = await prisma.city.findMany({
        where: { pincodePrefixes: { has: query } },
        take: 5,
      })
      if (matchingCities.length > 0) {
        const data = matchingCities.map(c => ({
          cityId: c.id,
          cityName: c.name,
          citySlug: c.slug,
          pincode: null,
          areaName: null,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
        }))
        return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
      }

      return NextResponse.json({ success: true, data: [] }, { headers: cacheHeaders })
    }

    // City name text search (also search aliases)
    const cities = await prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { aliases: { has: query.toLowerCase() } },
        ],
      },
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

    return NextResponse.json({ success: true, data }, { headers: cacheHeaders })

  } catch (err) {
    console.error('[city/resolve] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
