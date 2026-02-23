import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole, isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const vendorUpdateOrderSchema = z.object({
  action: z.enum(['accept', 'reject', 'preparing', 'out_for_delivery', 'delivered']),
  note: z.string().max(500).optional(),
})

async function getVendor(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session?.id) return null
  if (!isVendorRole(session.role) && !isAdminRole(session.role)) return null
  const supabase = getSupabaseAdmin()
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('userId', session.id)
    .single()
  return vendor
}

// GET: Single order detail for vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vendor = await getVendor(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(id, name, slug, images)), addresses(*), users(id, name, phone, email), order_status_history(*), payments(status, method)')
      .eq('id', id)
      .eq('vendorId', vendor.id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        subtotal: Number(order.subtotal),
        deliveryCharge: Number(order.deliveryCharge),
        discount: Number(order.discount),
        surcharge: Number(order.surcharge),
        total: Number(order.total),
        vendorCost: order.vendorCost ? Number(order.vendorCost) : null,
        commissionAmount: order.commissionAmount ? Number(order.commissionAmount) : null,
        items: order.order_items,
        address: order.addresses,
        user: order.users,
        statusHistory: order.order_status_history,
        payment: Array.isArray(order.payments) ? order.payments[0] : order.payments,
      },
    })
  } catch (error) {
    console.error('Vendor order GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH: Vendor actions on an order (accept, reject, update status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vendor = await getVendor(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = vendorUpdateOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { action, note } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify order belongs to vendor
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('vendorId', vendor.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Map action to status and validate transitions
    const actionToStatus: Record<string, string> = {
      accept: 'CONFIRMED',
      reject: 'CANCELLED',
      preparing: 'PREPARING',
      out_for_delivery: 'OUT_FOR_DELIVERY',
      delivered: 'DELIVERED',
    }

    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['accept', 'reject'],
      CONFIRMED: ['preparing', 'reject'],
      PREPARING: ['out_for_delivery'],
      OUT_FOR_DELIVERY: ['delivered'],
    }

    const allowed = allowedTransitions[order.status] || []
    if (!allowed.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Cannot ${action} an order with status ${order.status}` },
        { status: 400 }
      )
    }

    const newStatus = actionToStatus[action]

    // Sequential queries (no interactive transaction — pgbouncer compatible)
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }
    if (action === 'reject' && order.paymentStatus === 'PAID') {
      updateData.paymentStatus = 'REFUNDED'
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    await supabase
      .from('order_status_history')
      .insert({
        orderId: id,
        status: newStatus,
        note: note || `Vendor ${action}ed the order`,
        changedBy: vendor.userId,
      })

    // Update vendor total orders count on delivery
    if (action === 'delivered') {
      // Supabase doesn't have increment, so fetch + update
      const { data: currentVendor } = await supabase
        .from('vendors')
        .select('totalOrders')
        .eq('id', vendor.id)
        .single()

      if (currentVendor) {
        await supabase
          .from('vendors')
          .update({
            totalOrders: (currentVendor.totalOrders || 0) + 1,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', vendor.id)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        total: Number(updated.total),
        subtotal: Number(updated.subtotal),
      },
    })
  } catch (error) {
    console.error('Vendor order PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
