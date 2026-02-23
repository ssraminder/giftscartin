import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { updateOrderStatusSchema } from '@/lib/validations'

// PATCH: Update order status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, note } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify order exists
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prevent status changes on already completed/cancelled orders
    if (order.status === 'DELIVERED' || order.status === 'REFUNDED') {
      return NextResponse.json(
        { success: false, error: `Cannot change status of a ${order.status.toLowerCase()} order` },
        { status: 400 }
      )
    }

    // Update order
    const updateData: Record<string, unknown> = { status, updatedAt: new Date().toISOString() }
    if (status === 'CANCELLED') {
      updateData.paymentStatus = order.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED'
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('order_status_history').insert({
      orderId: id,
      status,
      note: note || null,
      changedBy: user.id,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
