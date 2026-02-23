import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

// ==================== GET — Single city with zones and delivery config ====================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: city, error } = await supabase
      .from('cities')
      .select('*, city_zones(*), city_delivery_configs(*, delivery_slots(*))')
      .eq('id', params.id)
      .single()

    if (error || !city) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      )
    }

    // Get vendor count
    const { count: vendorCount } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('cityId', params.id)

    // Sort zones by name
    const zones = (city.city_zones || []).sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name)
    )

    return NextResponse.json({
      success: true,
      data: {
        ...city,
        baseDeliveryCharge: Number(city.baseDeliveryCharge),
        freeDeliveryAbove: Number(city.freeDeliveryAbove),
        lat: Number(city.lat),
        lng: Number(city.lng),
        zones: zones.map((z: { extraCharge: number | string; [key: string]: unknown }) => ({
          ...z,
          extraCharge: Number(z.extraCharge),
        })),
        deliveryConfig: city.city_delivery_configs?.map((dc: { delivery_slots: unknown; [key: string]: unknown }) => ({
          ...dc,
          slot: dc.delivery_slots,
        })),
        _count: { vendors: vendorCount || 0 },
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
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: existing, error: findError } = await supabase
      .from('cities')
      .select('*')
      .eq('id', params.id)
      .single()

    if (findError || !existing) {
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
      const { data: slugExists } = await supabase
        .from('cities')
        .select('id')
        .eq('slug', data.slug)
        .single()

      if (slugExists) {
        return NextResponse.json(
          { success: false, error: `Slug "${data.slug}" is already in use` },
          { status: 400 }
        )
      }
    }

    // Sequential queries (no transaction — pgbouncer incompatible)

    // Update city fields
    const cityUpdate: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (data.name !== undefined) cityUpdate.name = data.name
    if (data.slug !== undefined) cityUpdate.slug = data.slug
    if (data.state !== undefined) cityUpdate.state = data.state
    if (data.lat !== undefined) cityUpdate.lat = data.lat
    if (data.lng !== undefined) cityUpdate.lng = data.lng
    if (data.baseDeliveryCharge !== undefined) cityUpdate.baseDeliveryCharge = data.baseDeliveryCharge
    if (data.freeDeliveryAbove !== undefined) cityUpdate.freeDeliveryAbove = data.freeDeliveryAbove
    if (data.isActive !== undefined) cityUpdate.isActive = data.isActive

    if (Object.keys(cityUpdate).length > 1) { // > 1 because updatedAt is always present
      const { error: updateError } = await supabase
        .from('cities')
        .update(cityUpdate)
        .eq('id', params.id)

      if (updateError) throw updateError
    }

    // Handle zones — delete removed, upsert existing
    if (data.zones !== undefined) {
      const incomingIds = data.zones.filter((z) => z.id).map((z) => z.id!)

      // Delete zones that are no longer in the list
      if (incomingIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('city_zones')
          .delete()
          .eq('cityId', params.id)
          .not('id', 'in', `(${incomingIds.join(',')})`)

        if (deleteError) throw deleteError
      } else {
        // All zones are new — delete all existing
        const { error: deleteError } = await supabase
          .from('city_zones')
          .delete()
          .eq('cityId', params.id)

        if (deleteError) throw deleteError
      }

      for (const zone of data.zones) {
        if (zone.id) {
          // Update existing zone
          const { error: zoneUpdateError } = await supabase
            .from('city_zones')
            .update({
              name: zone.name,
              pincodes: zone.pincodes,
              extraCharge: zone.extraCharge,
            })
            .eq('id', zone.id)

          if (zoneUpdateError) throw zoneUpdateError
        } else {
          // Create new zone
          const { error: zoneCreateError } = await supabase
            .from('city_zones')
            .insert({
              cityId: params.id,
              name: zone.name,
              pincodes: zone.pincodes,
              extraCharge: zone.extraCharge,
            })

          if (zoneCreateError) throw zoneCreateError
        }
      }
    }

    // Fetch updated city
    const { data: updated, error: fetchError } = await supabase
      .from('cities')
      .select('*, city_zones(*), city_delivery_configs(*, delivery_slots(*))')
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    // Get vendor count
    const { count: vendorCount } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('cityId', params.id)

    // Sort zones by name
    const zones = (updated.city_zones || []).sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name)
    )

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        zones,
        deliveryConfig: updated.city_delivery_configs?.map((dc: { delivery_slots: unknown; [key: string]: unknown }) => ({
          ...dc,
          slot: dc.delivery_slots,
        })),
        _count: { vendors: vendorCount || 0 },
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/cities/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update city'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
