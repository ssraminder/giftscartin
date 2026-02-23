import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

// POST: Record manual payment for an order
export async function POST(
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
    const { paymentMethodId, amount, transactionRef, notes, paidAt } = body

    if (!paymentMethodId || !amount || !paidAt) {
      return NextResponse.json(
        { success: false, error: 'Payment method, amount, and payment date are required' },
        { status: 400 }
      )
    }

    const parsedPaidAt = new Date(paidAt)
    if (isNaN(parsedPaidAt.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment date' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Verify order exists and payment is not already recorded
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Payment already recorded for this order' },
        { status: 400 }
      )
    }

    // Verify payment method exists
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .maybeSingle()

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    // Update order payment status and method
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod.name,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Upsert payment record — check if exists first
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('orderId', id)
      .maybeSingle()

    if (existingPayment) {
      await supabase.from('payments').update({
        amount,
        method: paymentMethod.slug,
        status: 'PAID',
        paidAt: parsedPaidAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }).eq('id', existingPayment.id)
    } else {
      await supabase.from('payments').insert({
        orderId: id,
        amount,
        currency: 'INR',
        gateway: 'COD',
        method: paymentMethod.slug,
        status: 'PAID',
        paidAt: parsedPaidAt.toISOString(),
      })
    }

    // Add status history entry
    const historyNote = [
      `Payment recorded manually by admin`,
      paymentMethod.name ? ` — ${paymentMethod.name}` : '',
      transactionRef ? ` (Ref: ${transactionRef})` : '',
      notes ? ` — ${notes}` : '',
    ].join('')

    await supabase.from('order_status_history').insert({
      orderId: id,
      status: order.status,
      note: historyNote,
      changedBy: user.id,
    })

    return NextResponse.json({ success: true, data: updatedOrder })
  } catch (error) {
    console.error('POST /api/admin/orders/[id]/payment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
