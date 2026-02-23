import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH: activate / deactivate / update name
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.isActive !== undefined) data.is_active = body.isActive
    if (body.name) data.name = body.name

    const supabase = getSupabaseAdmin()
    const { data: area, error } = await supabase
      .from('service_areas')
      .update(data)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: area })
  } catch (error) {
    console.error('Update area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update area' },
      { status: 500 }
    )
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user?.role || !['SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('service_areas')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete area' },
      { status: 500 }
    )
  }
}
