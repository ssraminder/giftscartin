import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { lookupPincode } from '@/lib/nominatim'

export const dynamic = 'force-dynamic'

// GET: list areas with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const city = request.nextUrl.searchParams.get('city')
    const status = request.nextUrl.searchParams.get('status')
    const search = request.nextUrl.searchParams.get('search')
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50')

    const where: Record<string, unknown> = {}
    if (city) where.cityId = city
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { pincode: { contains: search } },
      ]
    }

    const [areas, total] = await Promise.all([
      prisma.serviceArea.findMany({
        where,
        orderBy: [{ isActive: 'asc' }, { cityName: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.serviceArea.count({ where }),
    ])

    // Stats
    const [totalAreas, activeAreas, inactiveAreas, cityCount] = await Promise.all([
      prisma.serviceArea.count(),
      prisma.serviceArea.count({ where: { isActive: true } }),
      prisma.serviceArea.count({ where: { isActive: false } }),
      prisma.serviceArea.groupBy({ by: ['cityName'], _count: true }).then(r => r.length),
    ])

    return NextResponse.json({
      success: true,
      data: {
        areas,
        total,
        page,
        pageSize,
        stats: {
          totalAreas,
          activeAreas,
          inactiveAreas,
          cityCount,
        },
      },
    })
  } catch (error) {
    console.error('Areas list error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch areas' },
      { status: 500 }
    )
  }
}

// POST: add new area manually
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, pincode, cityId, isActive = true } = body

    if (!name || !pincode || !cityId) {
      return NextResponse.json(
        { success: false, error: 'Name, pincode, and cityId are required' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, error: 'Valid 6-digit pincode required' },
        { status: 400 }
      )
    }

    // Get city details
    const city = await prisma.city.findUnique({ where: { id: cityId } })
    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 400 }
      )
    }

    // Lookup coords if not provided
    let lat = body.lat
    let lng = body.lng
    if (!lat || !lng) {
      const nominatim = await lookupPincode(pincode)
      if (nominatim) {
        lat = nominatim.lat
        lng = nominatim.lng
      } else {
        lat = Number(city.lat)
        lng = Number(city.lng)
      }
    }

    const area = await prisma.serviceArea.create({
      data: {
        name,
        pincode,
        cityId,
        cityName: city.name,
        state: city.state,
        lat,
        lng,
        isActive,
      },
    })

    return NextResponse.json({ success: true, data: area })
  } catch (error) {
    console.error('Create area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create area' },
      { status: 500 }
    )
  }
}
