import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

// ==================== GET — Single city with zones and delivery config ====================

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user ||
      !['ADMIN', 'SUPER_ADMIN'].includes(
        (session.user as { role?: string }).role || ''
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const city = await prisma.city.findUnique({
      where: { id: params.id },
      include: {
        zones: { orderBy: { name: 'asc' } },
        deliveryConfig: { include: { slot: true } },
        _count: { select: { vendors: true } },
      },
    })

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...city,
        baseDeliveryCharge: Number(city.baseDeliveryCharge),
        freeDeliveryAbove: Number(city.freeDeliveryAbove),
        lat: Number(city.lat),
        lng: Number(city.lng),
        zones: city.zones.map((z) => ({
          ...z,
          extraCharge: Number(z.extraCharge),
        })),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/cities/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch city' },
      { status: 500 }
    )
  }
}

// ==================== PUT — Update city + zones ====================

const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Zone name is required'),
  pincodes: z.array(z.string().regex(/^\d{6}$/, 'Invalid pincode')).min(1, 'At least one pincode required'),
  extraCharge: z.number().min(0).default(0),
})

const updateCitySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  state: z.string().min(1).max(200).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  baseDeliveryCharge: z.number().min(0).optional(),
  freeDeliveryAbove: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  zones: z.array(zoneSchema).min(1, 'At least one delivery zone is required').optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user ||
      !['ADMIN', 'SUPER_ADMIN'].includes(
        (session.user as { role?: string }).role || ''
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const existing = await prisma.city.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateCitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check slug uniqueness if changing slug
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.city.findUnique({ where: { slug: data.slug } })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: `Slug "${data.slug}" is already in use` },
          { status: 400 }
        )
      }
    }

    // Sequential queries (no $transaction — pgbouncer incompatible)

    // Update city fields
    const cityUpdate: Record<string, unknown> = {}
    if (data.name !== undefined) cityUpdate.name = data.name
    if (data.slug !== undefined) cityUpdate.slug = data.slug
    if (data.state !== undefined) cityUpdate.state = data.state
    if (data.lat !== undefined) cityUpdate.lat = data.lat
    if (data.lng !== undefined) cityUpdate.lng = data.lng
    if (data.baseDeliveryCharge !== undefined) cityUpdate.baseDeliveryCharge = data.baseDeliveryCharge
    if (data.freeDeliveryAbove !== undefined) cityUpdate.freeDeliveryAbove = data.freeDeliveryAbove
    if (data.isActive !== undefined) cityUpdate.isActive = data.isActive

    if (Object.keys(cityUpdate).length > 0) {
      await prisma.city.update({
        where: { id: params.id },
        data: cityUpdate,
      })
    }

    // Handle zones — delete removed, upsert existing
    if (data.zones !== undefined) {
      const incomingIds = data.zones.filter((z) => z.id).map((z) => z.id!)

      // Delete zones that are no longer in the list
      if (incomingIds.length > 0) {
        await prisma.cityZone.deleteMany({
          where: {
            cityId: params.id,
            id: { notIn: incomingIds },
          },
        })
      } else {
        // All zones are new — delete all existing
        await prisma.cityZone.deleteMany({
          where: { cityId: params.id },
        })
      }

      for (const zone of data.zones) {
        if (zone.id) {
          // Update existing zone
          await prisma.cityZone.update({
            where: { id: zone.id },
            data: {
              name: zone.name,
              pincodes: zone.pincodes,
              extraCharge: zone.extraCharge,
            },
          })
        } else {
          // Create new zone
          await prisma.cityZone.create({
            data: {
              cityId: params.id,
              name: zone.name,
              pincodes: zone.pincodes,
              extraCharge: zone.extraCharge,
            },
          })
        }
      }
    }

    // Fetch updated city
    const updated = await prisma.city.findUnique({
      where: { id: params.id },
      include: {
        zones: { orderBy: { name: 'asc' } },
        deliveryConfig: { include: { slot: true } },
        _count: { select: { vendors: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/admin/cities/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update city'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
