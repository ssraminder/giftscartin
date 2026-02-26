import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const saveCoverageSchema = z.object({
  selections: z.array(z.object({
    serviceAreaId: z.string().uuid(),
    deliverySurcharge: z.number().min(0).default(0),
  })),
})

async function getVendorForSession(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session?.id || !isVendorRole(session.role)) return null
  const supabase = getSupabaseAdmin()
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, cityId')
    .eq('userId', session.id)
    .single()
  return vendor
}

// GET: Fetch current vendor's service areas
export async function GET(request: NextRequest) {
  try {
    const vendor = await getVendorForSession(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: areas, error } = await supabase
      .from('vendor_service_areas')
      .select('*, service_areas(name, pincode, city_name)')
      .eq('vendor_id', vendor.id)
      .order('requested_at', { ascending: false })

    if (error) throw error

    const mapped = (areas || []).map((row: Record<string, unknown>) => {
      const sa = row.service_areas as { name: string; pincode: string; city_name: string } | null
      return {
        id: row.id,
        serviceAreaId: row.service_area_id,
        name: sa?.name || '',
        pincode: sa?.pincode || '',
        cityName: sa?.city_name || '',
        deliverySurcharge: Number(row.delivery_surcharge),
        status: row.status,
        isActive: row.is_active,
        requestedAt: row.requested_at,
        activatedAt: row.activated_at,
        rejectionReason: row.rejection_reason,
      }
    })

    // Sort by city_name then name
    mapped.sort((a: { cityName: string; name: string }, b: { cityName: string; name: string }) =>
      a.cityName.localeCompare(b.cityName) || a.name.localeCompare(b.name)
    )

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Vendor coverage GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coverage' },
      { status: 500 }
    )
  }
}

// POST: Save/update vendor's coverage selection
export async function POST(request: NextRequest) {
  try {
    const vendor = await getVendorForSession(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = saveCoverageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { selections } = parsed.data
    const supabase = getSupabaseAdmin()
    const selectedAreaIds = new Set(selections.map(s => s.serviceAreaId))

    // Get current vendor service areas
    const { data: current } = await supabase
      .from('vendor_service_areas')
      .select('id, service_area_id, status')
      .eq('vendor_id', vendor.id)

    const currentMap = new Map(
      (current || []).map((row: { id: string; service_area_id: string; status: string }) => [
        row.service_area_id,
        { id: row.id, status: row.status },
      ])
    )

    // Delete PENDING areas that are NOT in the new selections
    const toDelete: string[] = []
    currentMap.forEach((info, areaId) => {
      if (!selectedAreaIds.has(areaId) && info.status === 'PENDING') {
        toDelete.push(info.id)
      }
    })

    if (toDelete.length > 0) {
      await supabase
        .from('vendor_service_areas')
        .delete()
        .in('id', toDelete)
    }

    // Upsert selections
    for (const sel of selections) {
      const existing = currentMap.get(sel.serviceAreaId)

      if (existing) {
        // If ACTIVE, only update surcharge — don't downgrade status
        if (existing.status === 'ACTIVE') {
          await supabase
            .from('vendor_service_areas')
            .update({ delivery_surcharge: sel.deliverySurcharge })
            .eq('id', existing.id)
        } else {
          // PENDING or REJECTED — update surcharge and reset to PENDING
          await supabase
            .from('vendor_service_areas')
            .update({
              delivery_surcharge: sel.deliverySurcharge,
              status: 'PENDING',
              is_active: false,
              requested_at: new Date().toISOString(),
              rejection_reason: null,
            })
            .eq('id', existing.id)
        }
      } else {
        // New selection — insert as PENDING
        await supabase
          .from('vendor_service_areas')
          .insert({
            vendor_id: vendor.id,
            service_area_id: sel.serviceAreaId,
            delivery_surcharge: sel.deliverySurcharge,
            status: 'PENDING',
            is_active: false,
            requested_at: new Date().toISOString(),
          })
      }
    }

    // Return updated list
    const { data: updated } = await supabase
      .from('vendor_service_areas')
      .select('*, service_areas(name, pincode, city_name)')
      .eq('vendor_id', vendor.id)
      .order('requested_at', { ascending: false })

    const mapped = (updated || []).map((row: Record<string, unknown>) => {
      const sa = row.service_areas as { name: string; pincode: string; city_name: string } | null
      return {
        id: row.id,
        serviceAreaId: row.service_area_id,
        name: sa?.name || '',
        pincode: sa?.pincode || '',
        cityName: sa?.city_name || '',
        deliverySurcharge: Number(row.delivery_surcharge),
        status: row.status,
        isActive: row.is_active,
        requestedAt: row.requested_at,
        activatedAt: row.activated_at,
        rejectionReason: row.rejection_reason,
      }
    })

    mapped.sort((a: { cityName: string; name: string }, b: { cityName: string; name: string }) =>
      a.cityName.localeCompare(b.cityName) || a.name.localeCompare(b.name)
    )

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Vendor coverage POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save coverage' },
      { status: 500 }
    )
  }
}
