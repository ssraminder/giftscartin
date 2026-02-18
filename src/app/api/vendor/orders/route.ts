import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { paginationSchema } from '@/lib/validations'
import { z } from 'zod/v4'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const vendorOrdersQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
})

async function getVendor() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (user.role !== 'VENDOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null
  return prisma.vendor.findUnique({ where: { userId: user.id } })
}

// GET: List vendor's orders
export async function GET(request: NextRequest) {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = vendorOrdersQuerySchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { page, pageSize, status } = parsed.data
    const skip = (page - 1) * pageSize

    const where: Prisma.OrderWhereInput = {
      vendorId: vendor.id,
    }

    if (status) {
      where.status = status
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
          address: true,
          user: {
            select: { id: true, name: true, phone: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((o) => ({
          ...o,
          subtotal: Number(o.subtotal),
          deliveryCharge: Number(o.deliveryCharge),
          discount: Number(o.discount),
          surcharge: Number(o.surcharge),
          total: Number(o.total),
        })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('Vendor orders GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
