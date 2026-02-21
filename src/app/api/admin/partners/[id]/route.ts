import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || !user?.role || !isAdminRole(user.role)) return null
  return user
}

// GET: single partner
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const partner = await prisma.partner.findUnique({
      where: { id: params.id },
      include: {
        defaultCity: { select: { name: true } },
        defaultVendor: { select: { businessName: true } },
        _count: { select: { orders: true, earnings: true } },
      },
    })

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    console.error('GET /api/admin/partners/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner' },
      { status: 500 }
    )
  }
}

// PATCH: update partner
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      refCode,
      commissionPercent,
      defaultCityId,
      defaultVendorId,
      logoUrl,
      primaryColor,
      showPoweredBy,
      isActive,
    } = body

    // Check refCode uniqueness if changing
    if (refCode) {
      const existing = await prisma.partner.findFirst({
        where: { refCode, NOT: { id: params.id } },
      })
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Ref code already in use' },
          { status: 409 }
        )
      }
    }

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(refCode !== undefined && {
          refCode: refCode.trim().toLowerCase(),
        }),
        ...(commissionPercent !== undefined && { commissionPercent }),
        ...(defaultCityId !== undefined && {
          defaultCityId: defaultCityId || null,
        }),
        ...(defaultVendorId !== undefined && {
          defaultVendorId: defaultVendorId || null,
        }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(showPoweredBy !== undefined && { showPoweredBy }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    console.error('PATCH /api/admin/partners/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update partner' },
      { status: 500 }
    )
  }
}
