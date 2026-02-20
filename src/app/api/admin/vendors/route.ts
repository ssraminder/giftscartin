import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const vendorListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED']).optional(),
  cityId: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const createVendorSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(200),
  ownerName: z.string().min(2, 'Owner name is required').max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)'),
  email: z.string().email('Invalid email address'),
  cityId: z.string().min(1, 'City is required'),
  address: z.string().min(5, 'Address is required').max(500),
  categories: z.array(z.string()).default([]),
  commissionRate: z.number().min(0).max(100).default(12),
  autoAccept: z.boolean().default(false),
  workingHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string(),
    closeTime: z.string(),
    isClosed: z.boolean().default(false),
  })).optional(),
  pincodes: z.array(z.object({
    pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
    deliveryCharge: z.number().min(0).default(0),
  })).optional(),
})

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// GET — list vendors with filters, search, pagination
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = vendorListSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, cityId, search, page, pageSize } = parsed.data

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (cityId) where.cityId = cityId
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          city: { select: { id: true, name: true, slug: true } },
          _count: { select: { orders: true, products: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vendor.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: vendors.map((v) => ({
          ...v,
          commissionRate: Number(v.commissionRate),
          rating: Number(v.rating),
        })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('Admin vendors GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

// POST — create vendor + user account + default working hours
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check if user with this email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone },
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email or phone already exists' },
        { status: 409 }
      )
    }

    // Check if city exists
    const city = await prisma.city.findUnique({ where: { id: data.cityId } })
    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 400 }
      )
    }

    // 1. Create user with VENDOR role
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        name: data.ownerName,
        role: 'VENDOR',
      },
    })

    // 2. Create vendor linked to user
    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: data.businessName,
        ownerName: data.ownerName,
        phone: data.phone,
        email: data.email,
        cityId: data.cityId,
        address: data.address,
        categories: data.categories,
        commissionRate: data.commissionRate,
        autoAccept: data.autoAccept,
        status: 'APPROVED',
      },
    })

    // 3. Create working hours (custom or default 9AM-9PM all days)
    const workingHours = data.workingHours && data.workingHours.length === 7
      ? data.workingHours
      : Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: '09:00',
          closeTime: '21:00',
          isClosed: false,
        }))

    for (const wh of workingHours) {
      await prisma.vendorWorkingHours.create({
        data: {
          vendorId: vendor.id,
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
          isClosed: wh.isClosed,
        },
      })
    }

    // 4. Create pincodes if provided
    if (data.pincodes && data.pincodes.length > 0) {
      for (const pc of data.pincodes) {
        await prisma.vendorPincode.create({
          data: {
            vendorId: vendor.id,
            pincode: pc.pincode,
            deliveryCharge: pc.deliveryCharge,
          },
        })
      }
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminRole: admin.role,
        actionType: 'vendor_create',
        entityType: 'vendor',
        entityId: vendor.id,
        fieldChanged: 'all',
        newValue: { businessName: data.businessName, ownerName: data.ownerName, email: data.email },
        reason: 'Admin created vendor',
      },
    })

    // Fetch the full vendor with relations
    const fullVendor = await prisma.vendor.findUnique({
      where: { id: vendor.id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        _count: { select: { orders: true, products: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: fullVendor ? {
        ...fullVendor,
        commissionRate: Number(fullVendor.commissionRate),
        rating: Number(fullVendor.rating),
      } : vendor,
    }, { status: 201 })
  } catch (error) {
    console.error('Admin vendor POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}
