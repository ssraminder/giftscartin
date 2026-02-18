import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const assignVendorSchema = z.object({
  vendorId: z.string().min(1),
})

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null
  return user
}

// POST: Assign a vendor to an order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = assignVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { vendorId } = parsed.data

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify vendor exists and is approved
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    if (vendor.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Vendor is not approved' },
        { status: 400 }
      )
    }

    // Update order with vendor assignment
    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { vendorId },
      })

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status,
          note: `Vendor assigned: ${vendor.businessName}`,
          changedBy: admin.id,
        },
      })

      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          adminRole: admin.role,
          actionType: 'order_assign_vendor',
          entityType: 'order',
          entityId: id,
          fieldChanged: 'vendorId',
          oldValue: { vendorId: order.vendorId },
          newValue: { vendorId },
          reason: `Assigned vendor ${vendor.businessName} to order ${order.orderNumber}`,
        },
      })

      return updatedOrder
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Admin assign vendor error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign vendor' },
      { status: 500 }
    )
  }
}
