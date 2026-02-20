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
        const cities = await prisma.city.findMany({
          where: {
            pincodePrefixes: { isEmpty: false },
          },
        })
        for (const city of cities) {
          const matches = city.pincodePrefixes.some((prefix) =>
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
              isActive: city.isActive,
              isComingSoon: city.isComingSoon,
            })
          }
        }
      }
    }
    // Case 2: Partial pincode (2-5 digits)
    else if (/^\d{2,5}$/.test(trimmed)) {
      const cities = await prisma.city.findMany({
        where: {
          pincodePrefixes: { isEmpty: false },
        },
      })
      for (const city of cities) {
        const matches = city.pincodePrefixes.some(
          (prefix) =>
            prefix.startsWith(trimmed) || trimmed.startsWith(prefix)
        )
        if (matches) {
          results.push({
            cityId: city.id,
            cityName: city.name,
            citySlug: city.slug,
            state: city.state,
            isActive: city.isActive,
            isComingSoon: city.isComingSoon,
          })
        }
      }
    }
    // Case 3: Text search — city name or alias
    else {
      const lower = trimmed.toLowerCase()

      // Search by name (ILIKE)
      const cities = await prisma.city.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { slug: { contains: lower } },
          ],
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        take: 8,
      })

      // Separate exact matches from partial
      const exactMatches: CityMatch[] = []
      const partialMatches: CityMatch[] = []

      for (const city of cities) {
        const match: CityMatch = {
          cityId: city.id,
          cityName: city.name,
          citySlug: city.slug,
          state: city.state,
          isActive: city.isActive,
          isComingSoon: city.isComingSoon,
        }
        if (city.name.toLowerCase() === lower) {
          exactMatches.push(match)
        } else {
          partialMatches.push(match)
        }
      }

      // Also search aliases
      const allCities = await prisma.city.findMany({
        where: {
          aliases: { isEmpty: false },
        },
      })
      for (const city of allCities) {
        const aliasMatch = city.aliases.some(
          (alias) => alias.toLowerCase().includes(lower)
        )
        if (aliasMatch) {
          const alreadyIncluded = [...exactMatches, ...partialMatches].some(
            (m) => m.cityId === city.id
          )
          if (!alreadyIncluded) {
            const match: CityMatch = {
              cityId: city.id,
              cityName: city.name,
              citySlug: city.slug,
              state: city.state,
              isActive: city.isActive,
              isComingSoon: city.isComingSoon,
            }
            if (city.aliases.some((a) => a.toLowerCase() === lower)) {
              exactMatches.push(match)
            } else {
              partialMatches.push(match)
            }
          }
        }
      }

      results.push(...exactMatches, ...partialMatches)
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
    console.error('POST /api/city/resolve error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve city' },
      { status: 500 }
    )
  }
}
