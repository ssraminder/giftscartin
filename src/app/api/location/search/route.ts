import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LocationResult } from '@/types'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

/**
 * DB-only location search.
 *
 * Strategy:
 * - Pincode queries → service_areas → city_zones → pincode_city_map → prefix match
 * - Text queries → service_areas (name + altNames) → cities (name + aliases)
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: true, data: { results: [] } },
        { headers: CACHE_HEADERS }
      )
    }

    const isDigits = /^\d+$/.test(q)
    const isExactPincode = /^\d{6}$/.test(q)

    let results: LocationResult[]

    if (isDigits) {
      results = await searchByPincode(q, isExactPincode)
    } else {
      results = await searchByText(q)
    }

    return NextResponse.json(
      { success: true, data: { results: results.slice(0, 10) } },
      { headers: CACHE_HEADERS }
    )
  } catch (err) {
    console.error('[location/search] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}

/**
 * Search by pincode.
 * Multi-layer: service_areas → city_zones → pincode_city_map → cities.pincodePrefixes
 */
async function searchByPincode(q: string, isExact: boolean): Promise<LocationResult[]> {
  const results: LocationResult[] = []

  if (isExact) {
    // Layer 1: service_areas (most granular — area-level with lat/lng)
    const exactAreas = await prisma.serviceArea.findMany({
      where: { pincode: q, isActive: true },
      include: { city: true },
      take: 8,
      orderBy: { name: 'asc' },
    })

    for (const a of exactAreas) {
      results.push({
        type: 'area',
        label: `${a.name}, ${a.city.name} \u2014 ${a.pincode}`,
        cityId: a.city.id,
        cityName: a.city.name,
        citySlug: a.city.slug,
        pincode: a.pincode,
        areaName: a.name,
        lat: a.lat ? Number(a.lat) : null,
        lng: a.lng ? Number(a.lng) : null,
        isActive: a.city.isActive,
        isComingSoon: a.city.isComingSoon,
      })
    }

    // Layer 2: city_zones (zone-level, pincodes[] array)
    if (results.length === 0) {
      const zones = await prisma.cityZone.findMany({
        where: { pincodes: { has: q }, isActive: true },
        include: { city: true },
        take: 5,
      })

      const seenCityIds = new Set<string>()
      for (const z of zones) {
        if (seenCityIds.has(z.city.id)) continue
        seenCityIds.add(z.city.id)
        results.push({
          type: 'city',
          label: `${z.city.name}, ${z.city.state} \u2014 ${q}`,
          cityId: z.city.id,
          cityName: z.city.name,
          citySlug: z.city.slug,
          pincode: q,
          areaName: z.name,
          lat: Number(z.city.lat),
          lng: Number(z.city.lng),
          isActive: z.city.isActive,
          isComingSoon: z.city.isComingSoon,
        })
      }
    }

    // Layer 3: pincode_city_map
    if (results.length === 0) {
      const pinMap = await prisma.pincodeCityMap.findUnique({
        where: { pincode: q },
        include: { city: true },
      })

      if (pinMap) {
        results.push({
          type: 'city',
          label: `${pinMap.city.name}, ${pinMap.city.state} \u2014 ${q}`,
          cityId: pinMap.city.id,
          cityName: pinMap.city.name,
          citySlug: pinMap.city.slug,
          pincode: q,
          areaName: pinMap.areaName,
          lat: Number(pinMap.city.lat),
          lng: Number(pinMap.city.lng),
          isActive: pinMap.city.isActive,
          isComingSoon: pinMap.city.isComingSoon,
        })
      }
    }

    // Layer 4: cities.pincodePrefixes (first 3 digits match)
    if (results.length === 0) {
      const prefix = q.slice(0, 3)
      const matchingCities = await prisma.city.findMany({
        where: { pincodePrefixes: { has: prefix } },
        take: 3,
      })

      for (const c of matchingCities) {
        results.push({
          type: 'city',
          label: `${c.name}, ${c.state} \u2014 ${q}`,
          cityId: c.id,
          cityName: c.name,
          citySlug: c.slug,
          pincode: q,
          areaName: null,
          lat: Number(c.lat),
          lng: Number(c.lng),
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
        })
      }
    }
  } else {
    // Partial pincode (2-5 digits) — prefix match on service_areas
    const areas = await prisma.serviceArea.findMany({
      where: {
        pincode: { startsWith: q },
        isActive: true,
      },
      include: { city: true },
      take: 8,
      orderBy: { pincode: 'asc' },
    })

    for (const a of areas) {
      results.push({
        type: 'area',
        label: `${a.name}, ${a.city.name} \u2014 ${a.pincode}`,
        cityId: a.city.id,
        cityName: a.city.name,
        citySlug: a.city.slug,
        pincode: a.pincode,
        areaName: a.name,
        lat: a.lat ? Number(a.lat) : null,
        lng: a.lng ? Number(a.lng) : null,
        isActive: a.city.isActive,
        isComingSoon: a.city.isComingSoon,
      })
    }

    // Fallback: cities.pincodePrefixes
    if (results.length === 0) {
      const matchingCities = await prisma.city.findMany({
        where: { pincodePrefixes: { has: q } },
        take: 5,
      })

      for (const c of matchingCities) {
        results.push({
          type: 'city',
          label: c.state ? `${c.name}, ${c.state}` : c.name,
          cityId: c.id,
          cityName: c.name,
          citySlug: c.slug,
          pincode: null,
          areaName: null,
          lat: Number(c.lat),
          lng: Number(c.lng),
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
        })
      }
    }
  }

  return results
}

/**
 * Search by text — service_areas (name + altNames) then cities (name + aliases).
 */
async function searchByText(q: string): Promise<LocationResult[]> {
  const results: LocationResult[] = []
  const qLower = q.toLowerCase()

  const [areas, altNameAreas, cities] = await Promise.all([
    // service_areas.name ILIKE '%q%'
    prisma.serviceArea.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true,
      },
      include: { city: true },
      take: 6,
      orderBy: { name: 'asc' },
    }),
    // service_areas.altNames has q (case-sensitive array match on lowercase)
    prisma.serviceArea.findMany({
      where: {
        altNames: { has: qLower },
        isActive: true,
      },
      include: { city: true },
      take: 3,
    }),
    // cities.name ILIKE '%q%' OR cities.aliases has q
    prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { aliases: { has: qLower } },
        ],
      },
      take: 5,
      orderBy: { name: 'asc' },
    }),
  ])

  // De-duplicate areas
  const seenAreaIds = new Set<string>()
  const allAreas = [...areas, ...altNameAreas]

  for (const a of allAreas) {
    if (seenAreaIds.has(a.id)) continue
    seenAreaIds.add(a.id)

    results.push({
      type: 'area',
      label: a.pincode
        ? `${a.name}, ${a.city.name} \u2014 ${a.pincode}`
        : `${a.name}, ${a.city.name}`,
      cityId: a.city.id,
      cityName: a.city.name,
      citySlug: a.city.slug,
      pincode: a.pincode,
      areaName: a.name,
      lat: a.lat ? Number(a.lat) : null,
      lng: a.lng ? Number(a.lng) : null,
      isActive: a.city.isActive,
      isComingSoon: a.city.isComingSoon,
    })
  }

  // De-duplicate cities (skip if city already represented by an area result)
  const seenCityIds = new Set(results.map(r => r.cityId))
  for (const c of cities) {
    if (seenCityIds.has(c.id)) continue
    seenCityIds.add(c.id)

    results.push({
      type: 'city',
      label: c.state ? `${c.name}, ${c.state}` : c.name,
      cityId: c.id,
      cityName: c.name,
      citySlug: c.slug,
      pincode: null,
      areaName: null,
      lat: Number(c.lat),
      lng: Number(c.lng),
      isActive: c.isActive,
      isComingSoon: c.isComingSoon,
    })
  }

  return results
}
