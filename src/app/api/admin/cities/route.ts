import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

// ==================== GET — List all cities with zone and vendor counts ====================

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user ||
      !isAdminRole(
        (session.user as { role?: string }).role || ''
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const cities = await prisma.city.findMany({
      include: {
        _count: { select: { zones: true, vendors: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: cities.map((c) => ({
        ...c,
        baseDeliveryCharge: Number(c.baseDeliveryCharge),
        freeDeliveryAbove: Number(c.freeDeliveryAbove),
        lat: Number(c.lat),
        lng: Number(c.lng),
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/cities error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}

// ==================== POST — Create city with zones ====================

const zoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required'),
  pincodes: z.array(z.string().regex(/^\d{6}$/, 'Invalid pincode')).min(1, 'At least one pincode required'),
  extraCharge: z.number().min(0).default(0),
})

const createCitySchema = z.object({
  name: z.string().min(1, 'City name is required').max(200),
  slug: z.string().min(1).max(200),
  state: z.string().min(1, 'State is required').max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  baseDeliveryCharge: z.number().min(0).default(49),
  freeDeliveryAbove: z.number().min(0).default(499),
  isActive: z.boolean().default(true),
  zones: z.array(zoneSchema).min(1, 'At least one delivery zone is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user ||
      !isAdminRole(
        (session.user as { role?: string }).role || ''
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createCitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check slug uniqueness
    const existingSlug = await prisma.city.findUnique({ where: { slug: data.slug } })
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" is already in use` },
        { status: 400 }
      )
    }

    // Sequential queries (no $transaction — pgbouncer incompatible)
    const city = await prisma.city.create({
      data: {
        name: data.name,
        slug: data.slug,
        state: data.state,
        lat: data.lat,
        lng: data.lng,
        baseDeliveryCharge: data.baseDeliveryCharge,
        freeDeliveryAbove: data.freeDeliveryAbove,
        isActive: data.isActive,
      },
    })

    for (const zone of data.zones) {
      await prisma.cityZone.create({
        data: {
          cityId: city.id,
          name: zone.name,
          pincodes: zone.pincodes,
          extraCharge: zone.extraCharge,
        },
      })
    }

    // Fetch full city with relations
    const full = await prisma.city.findUnique({
      where: { id: city.id },
      include: {
        zones: { orderBy: { name: 'asc' } },
        _count: { select: { vendors: true } },
      },
    })

    return NextResponse.json({ success: true, data: full }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/cities error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create city'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
