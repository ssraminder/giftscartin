import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

// PATCH: Update a payment method
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, isActive, sortOrder } = body

    const supabase = getSupabaseAdmin()

    // Verify it exists
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    if (isActive !== undefined) data.isActive = isActive
    if (sortOrder !== undefined) data.sortOrder = sortOrder

    const { data: updated, error } = await supabase
      .from('payment_methods')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/payment-methods/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payment method' },
      { status: 500 }
    )
  }
}
