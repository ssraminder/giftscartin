import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user as { id: string; role: string; email: string }
}

// GET: Fetch order details with items, address, payment, and status history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                category: { select: { name: true, slug: true } },
              },
            },
          },
        },
        address: true,
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            phone: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Only allow the order owner or admin/vendor to view
    if (order.userId !== user.id && user.role === 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this order' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
