import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin(request: NextRequest) {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, startDate, endDate, amount, appliesTo, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (startDate !== undefined) data.startDate = new Date(startDate).toISOString()
    if (endDate !== undefined) data.endDate = new Date(endDate).toISOString()
    if (amount !== undefined) data.amount = amount
    if (appliesTo !== undefined) data.appliesTo = appliesTo
    if (isActive !== undefined) data.isActive = isActive
    data.updatedAt = new Date().toISOString()

    const supabase = getSupabaseAdmin()

    const { data: surcharge, error } = await supabase
      .from('delivery_surcharges')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: surcharge })
  } catch (error) {
    console.error('PATCH /api/admin/delivery/surcharges/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update surcharge' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('delivery_surcharges')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/delivery/surcharges/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete surcharge' }, { status: 500 })
  }
}
