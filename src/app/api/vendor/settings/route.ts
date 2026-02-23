import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole, isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const updateVendorSettingsSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  ownerName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  address: z.string().min(5).max(500).optional(),
  isOnline: z.boolean().optional(),
  autoAccept: z.boolean().optional(),
  vacationStart: z.string().nullable().optional(),
  vacationEnd: z.string().nullable().optional(),
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
  deliveryRadiusKm: z.number().min(1).max(100).optional(),
})

async function getVendorWithRelations(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session?.id) return null
  if (!isVendorRole(session.role) && !isAdminRole(session.role)) return null
  const supabase = getSupabaseAdmin()
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*, cities(id, name, slug), vendor_working_hours(*), vendor_slots(*, delivery_slots(*)), vendor_pincodes(*), vendor_holidays(*)')
    .eq('userId', session.id)
    .single()
  return { vendor, session }
}

// GET: Vendor profile + settings
export async function GET(request: NextRequest) {
  try {
    const result = await getVendorWithRelations(request)
    if (!result?.vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const vendor = result.vendor

    return NextResponse.json({
      success: true,
      data: {
        ...vendor,
        commissionRate: Number(vendor.commissionRate),
        rating: Number(vendor.rating),
        lat: vendor.lat ? Number(vendor.lat) : null,
        lng: vendor.lng ? Number(vendor.lng) : null,
        deliveryRadiusKm: Number(vendor.delivery_radius_km ?? 0),
        city: vendor.cities,
        workingHours: vendor.vendor_working_hours,
        pincodes: (vendor.vendor_pincodes || []).map((p: Record<string, unknown>) => ({
          ...p,
          deliveryCharge: Number(p.deliveryCharge),
        })),
        slots: (vendor.vendor_slots || []).map((s: Record<string, unknown>) => {
          const slot = s.delivery_slots as Record<string, unknown> | null
          return {
            ...s,
            customCharge: s.customCharge ? Number(s.customCharge) : null,
            slot: slot ? {
              ...slot,
              baseCharge: Number(slot.baseCharge),
            } : null,
          }
        }),
        holidays: vendor.vendor_holidays,
      },
    })
  } catch (error) {
    console.error('Vendor settings GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor settings' },
      { status: 500 }
    )
  }
}

// PATCH: Update vendor settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!isVendorRole(session.role) && !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: vendor } = await supabase
      .from('vendors')
      .select('*')
      .eq('userId', session.id)
      .single()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateVendorSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }
    if (data.businessName !== undefined) updateData.businessName = data.businessName
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.address !== undefined) updateData.address = data.address
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline
    if (data.autoAccept !== undefined) updateData.autoAccept = data.autoAccept
    if (data.vacationStart !== undefined) updateData.vacationStart = data.vacationStart ? new Date(data.vacationStart).toISOString() : null
    if (data.vacationEnd !== undefined) updateData.vacationEnd = data.vacationEnd ? new Date(data.vacationEnd).toISOString() : null
    if (data.panNumber !== undefined) updateData.panNumber = data.panNumber
    if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber
    if (data.fssaiNumber !== undefined) updateData.fssaiNumber = data.fssaiNumber
    if (data.bankAccountNo !== undefined) updateData.bankAccountNo = data.bankAccountNo
    if (data.bankIfsc !== undefined) updateData.bankIfsc = data.bankIfsc
    if (data.bankName !== undefined) updateData.bankName = data.bankName
    if (data.deliveryRadiusKm !== undefined) updateData.delivery_radius_km = data.deliveryRadiusKm

    const { data: updated, error: updateError } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', vendor.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        commissionRate: Number(updated.commissionRate),
        rating: Number(updated.rating),
      },
    })
  } catch (error) {
    console.error('Vendor settings PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor settings' },
      { status: 500 }
    )
  }
}
