import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const assignVendorSchema = z.object({
  vendorId: z.string().min(1),
})

// POST: Assign a vendor to an order
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
    const parsed = assignVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { vendorId } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify order exists
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify vendor exists and is approved
    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle()
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

    // Update order
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ vendorId, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('order_status_history').insert({
      orderId: id,
      status: order.status,
      note: `Vendor assigned: ${vendor.businessName}`,
      changedBy: user.id,
    })

    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: 'order_assign_vendor',
      entityType: 'order',
      entityId: id,
      fieldChanged: 'vendorId',
      oldValue: { vendorId: order.vendorId },
      newValue: { vendorId },
      reason: `Assigned vendor ${vendor.businessName} to order ${order.orderNumber}`,
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
