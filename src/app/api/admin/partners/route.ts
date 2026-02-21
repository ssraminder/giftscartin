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

// GET: list all partners
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const partners = await prisma.partner.findMany({
      include: {
        defaultCity: { select: { name: true } },
        defaultVendor: { select: { businessName: true } },
        _count: { select: { orders: true, earnings: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    console.error('GET /api/admin/partners error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

// POST: create new partner
export async function POST(request: NextRequest) {
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

    if (!name?.trim() || !refCode?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name and ref code are required' },
        { status: 400 }
      )
    }

    // Check refCode uniqueness
    const existing = await prisma.partner.findUnique({
      where: { refCode },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ref code already in use' },
        { status: 409 }
      )
    }

    const partner = await prisma.partner.create({
      data: {
        name: name.trim(),
        refCode: refCode.trim().toLowerCase(),
        commissionPercent: commissionPercent ?? 5,
        defaultCityId: defaultCityId || null,
        defaultVendorId: defaultVendorId || null,
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || '#E91E63',
        showPoweredBy: showPoweredBy ?? true,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, data: partner }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/partners error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    )
  }
}
