import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isVendorRole, isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const updateVendorSettingsSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  ownerName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
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
})

async function getVendor() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isVendorRole(user.role) && !isAdminRole(user.role)) return null
  return prisma.vendor.findUnique({
    where: { userId: user.id },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      workingHours: { orderBy: { dayOfWeek: 'asc' } },
      slots: { include: { slot: true } },
      pincodes: true,
      holidays: { orderBy: { date: 'asc' } },
    },
  })
}

// GET: Vendor profile + settings
export async function GET() {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...vendor,
        commissionRate: Number(vendor.commissionRate),
        rating: Number(vendor.rating),
        lat: vendor.lat ? Number(vendor.lat) : null,
        lng: vendor.lng ? Number(vendor.lng) : null,
        pincodes: vendor.pincodes.map((p) => ({
          ...p,
          deliveryCharge: Number(p.deliveryCharge),
        })),
        slots: vendor.slots.map((s) => ({
          ...s,
          customCharge: s.customCharge ? Number(s.customCharge) : null,
          slot: {
            ...s.slot,
            baseCharge: Number(s.slot.baseCharge),
          },
        })),
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = session.user as { id: string; role: string }
    if (!isVendorRole(user.role) && !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } })
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

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
        ...(data.ownerName !== undefined ? { ownerName: data.ownerName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.isOnline !== undefined ? { isOnline: data.isOnline } : {}),
        ...(data.autoAccept !== undefined ? { autoAccept: data.autoAccept } : {}),
        ...(data.vacationStart !== undefined
          ? { vacationStart: data.vacationStart ? new Date(data.vacationStart) : null }
          : {}),
        ...(data.vacationEnd !== undefined
          ? { vacationEnd: data.vacationEnd ? new Date(data.vacationEnd) : null }
          : {}),
        ...(data.panNumber !== undefined ? { panNumber: data.panNumber } : {}),
        ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber } : {}),
        ...(data.fssaiNumber !== undefined ? { fssaiNumber: data.fssaiNumber } : {}),
        ...(data.bankAccountNo !== undefined ? { bankAccountNo: data.bankAccountNo } : {}),
        ...(data.bankIfsc !== undefined ? { bankIfsc: data.bankIfsc } : {}),
        ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
      },
    })

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
