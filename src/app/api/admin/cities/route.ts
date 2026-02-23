import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

// ==================== GET — List all cities with zone and vendor counts ====================

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: cities, error } = await supabase
      .from('cities')
      .select('*, city_zones(id), vendors(id)')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (cities || []).map((c) => ({
        ...c,
        baseDeliveryCharge: Number(c.baseDeliveryCharge),
        freeDeliveryAbove: Number(c.freeDeliveryAbove),
        lat: Number(c.lat),
        lng: Number(c.lng),
        _count: {
          zones: c.city_zones?.length || 0,
          vendors: c.vendors?.length || 0,
        },
        // Clean up embedded arrays from select
        city_zones: undefined,
        vendors: undefined,
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
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
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
    const supabase = getSupabaseAdmin()

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('cities')
      .select('id')
      .eq('slug', data.slug)
      .single()

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" is already in use` },
        { status: 400 }
      )
    }

    // Sequential queries (no transaction — pgbouncer incompatible)
    const { data: city, error: createError } = await supabase
      .from('cities')
      .insert({
        name: data.name,
        slug: data.slug,
        state: data.state,
        lat: data.lat,
        lng: data.lng,
        baseDeliveryCharge: data.baseDeliveryCharge,
        freeDeliveryAbove: data.freeDeliveryAbove,
        isActive: data.isActive,
      })
      .select()
      .single()

    if (createError || !city) throw createError

    for (const zone of data.zones) {
      const { error: zoneError } = await supabase
        .from('city_zones')
        .insert({
          cityId: city.id,
          name: zone.name,
          pincodes: zone.pincodes,
          extraCharge: zone.extraCharge,
        })

      if (zoneError) throw zoneError
    }

    // Fetch full city with relations
    const { data: full, error: fetchError } = await supabase
      .from('cities')
      .select('*, city_zones(*), vendors(id)')
      .eq('id', city.id)
      .single()

    if (fetchError) throw fetchError

    // Sort zones by name
    const zones = (full.city_zones || []).sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name)
    )

    return NextResponse.json({
      success: true,
      data: {
        ...full,
        zones,
        _count: { vendors: full.vendors?.length || 0 },
        city_zones: undefined,
        vendors: undefined,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/cities error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create city'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
