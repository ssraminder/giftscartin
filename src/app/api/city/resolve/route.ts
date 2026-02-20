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
  isActive: boolean
  isComingSoon: boolean
  displayName: string | null
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

    // Case 1: Exact 6-digit pincode — Prisma ORM handles camelCase mapping
    if (/^\d{6}$/.test(trimmed)) {
      const pinResult = await prisma.pincodeCityMap.findUnique({
        where: { pincode: trimmed },
        include: { city: true },
      })

      if (pinResult) {
        return NextResponse.json({
          success: true,
          data: [{
            cityId: pinResult.city.id,
            cityName: pinResult.city.name,
            citySlug: pinResult.city.slug,
            pincode: pinResult.pincode,
            areaName: pinResult.areaName,
            isActive: pinResult.city.isActive,
            isComingSoon: pinResult.city.isComingSoon,
          }],
        })
      }

      return NextResponse.json({ success: true, data: [] })
    }

    // Case 2: Partial pincode (2-5 digits) — raw SQL with camelCase columns
    if (/^\d{2,5}$/.test(trimmed)) {
      const cities = await prisma.$queryRaw<RawCityRow[]>`
        SELECT DISTINCT c.id, c.name, c.slug, c.state, c."isActive", c."isComingSoon", c."displayName"
        FROM cities c
        JOIN pincode_city_map p ON p."cityId" = c.id
        WHERE p.pincode LIKE ${trimmed + '%'}
        LIMIT 8
      `

      return NextResponse.json({
        success: true,
        data: cities.map((city): CityMatch => ({
          cityId: city.id,
          cityName: city.name,
          citySlug: city.slug,
          isActive: city.isActive,
          isComingSoon: city.isComingSoon,
        })),
      })
    }

    // Case 3: Text search — city name or alias (raw SQL for ILIKE alias support)
    const searchPattern = `%${trimmed}%`
    const cities = await prisma.$queryRaw<RawCityRow[]>`
      SELECT id, name, slug, state, "isActive", "isComingSoon", "displayName"
      FROM cities
      WHERE
        name ILIKE ${searchPattern}
        OR EXISTS (
          SELECT 1 FROM unnest(aliases) AS alias
          WHERE alias ILIKE ${searchPattern}
        )
      ORDER BY "isActive" DESC
      LIMIT 8
    `

    return NextResponse.json({
      success: true,
      data: cities.map((city): CityMatch => ({
        cityId: city.id,
        cityName: city.name,
        citySlug: city.slug,
        isActive: city.isActive,
        isComingSoon: city.isComingSoon,
      })),
    })
  } catch (error) {
    console.error('City resolve error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve city' },
      { status: 500 }
    )
  }
}
