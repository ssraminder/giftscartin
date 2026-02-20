import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const resolveSchema = z.object({
  query: z.string().min(1).max(100),
})

interface CityMatch {
  cityId: string
  cityName: string
  citySlug: string
  state: string
  pincode?: string
  areaName?: string | null
  isActive: boolean
  isComingSoon: boolean
}

interface RawCityRow {
  id: string
  name: string
  slug: string
  state: string
  is_active: boolean
  is_coming_soon: boolean
  display_name: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = resolveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query' },
        { status: 400 }
      )
    }

    const { query } = parsed.data
    const trimmed = query.trim()
    const results: CityMatch[] = []

    // Case 1: Exact 6-digit pincode
    if (/^\d{6}$/.test(trimmed)) {
      try {
        const pincodeRecord = await prisma.pincodeCityMap.findUnique({
          where: { pincode: trimmed },
          include: { city: true },
        })

        if (pincodeRecord) {
          results.push({
            cityId: pincodeRecord.city.id,
            cityName: pincodeRecord.city.name,
            citySlug: pincodeRecord.city.slug,
            state: pincodeRecord.city.state,
            pincode: pincodeRecord.pincode,
            areaName: pincodeRecord.areaName,
            isActive: pincodeRecord.city.isActive,
            isComingSoon: pincodeRecord.city.isComingSoon,
          })
        } else {
          // Pincode not in map — try matching by prefix against cities
          const cities = await prisma.$queryRaw<RawCityRow[]>`
            SELECT id, name, slug, state, is_active, is_coming_soon, display_name
            FROM cities
            WHERE pincode_prefix != '{}'
          `
          for (const city of cities) {
            // Fetch the pincode_prefix array for this city
            const prefixRows = await prisma.$queryRaw<{ pincode_prefix: string[] }[]>`
              SELECT pincode_prefix FROM cities WHERE id = ${city.id}
            `
            const prefixes = prefixRows[0]?.pincode_prefix ?? []
            const matches = prefixes.some((prefix: string) =>
              trimmed.startsWith(prefix)
            )
            if (matches) {
              results.push({
                cityId: city.id,
                cityName: city.name,
                citySlug: city.slug,
                state: city.state,
                pincode: trimmed,
                areaName: null,
                isActive: city.is_active,
                isComingSoon: city.is_coming_soon,
              })
            }
          }
        }
      } catch (err) {
        console.error('City resolve pincode query error:', err)
        throw err
      }
    }
    // Case 2: Partial pincode (2-5 digits)
    else if (/^\d{2,5}$/.test(trimmed)) {
      try {
        const cities = await prisma.$queryRaw<(RawCityRow & { pincode?: string })[]>`
          SELECT DISTINCT c.id, c.name, c.slug, c.state, c.is_active, c.is_coming_soon, c.display_name
          FROM cities c
          JOIN pincode_city_map p ON p.city_id = c.id
          WHERE p.pincode LIKE ${trimmed + '%'}
          LIMIT 8
        `
        for (const city of cities) {
          results.push({
            cityId: city.id,
            cityName: city.name,
            citySlug: city.slug,
            state: city.state,
            isActive: city.is_active,
            isComingSoon: city.is_coming_soon,
          })
        }
      } catch (err) {
        console.error('City resolve partial pincode query error:', err)
        throw err
      }
    }
    // Case 3: Text search — city name or alias
    else {
      try {
        const searchPattern = `%${trimmed}%`
        const cities = await prisma.$queryRaw<RawCityRow[]>`
          SELECT id, name, slug, state, is_active, is_coming_soon, display_name
          FROM cities
          WHERE
            name ILIKE ${searchPattern}
            OR slug ILIKE ${searchPattern}
            OR EXISTS (
              SELECT 1 FROM unnest(aliases) AS alias
              WHERE alias ILIKE ${searchPattern}
            )
          ORDER BY
            CASE WHEN lower(name) = lower(${trimmed}) THEN 0 ELSE 1 END,
            is_active DESC,
            name ASC
          LIMIT 8
        `

        for (const city of cities) {
          results.push({
            cityId: city.id,
            cityName: city.name,
            citySlug: city.slug,
            state: city.state,
            isActive: city.is_active,
            isComingSoon: city.is_coming_soon,
          })
        }
      } catch (err) {
        console.error('City resolve text search error:', err)
        throw err
      }
    }

    // Deduplicate and limit to 8
    const seen = new Set<string>()
    const deduped = results.filter((r) => {
      const key = `${r.cityId}-${r.pincode || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      success: true,
      data: deduped.slice(0, 8),
    })
  } catch (error) {
    console.error('City resolve error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
