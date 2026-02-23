import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, startTime, endTime, baseCharge, isActive } = body
    const supabase = getSupabaseAdmin()

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime
    if (baseCharge !== undefined) data.baseCharge = baseCharge
    if (isActive !== undefined) data.isActive = isActive

    const { data: slot, error } = await supabase
      .from('delivery_slots')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data: slot })
  } catch (error) {
    console.error('PATCH /api/admin/delivery/slots/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update delivery slot' }, { status: 500 })
  }
}
