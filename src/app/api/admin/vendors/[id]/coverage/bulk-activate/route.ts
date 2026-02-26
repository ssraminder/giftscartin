import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// POST: Activate all PENDING service areas for a vendor
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

    const { id: vendorId } = await params
    const supabase = getSupabaseAdmin()

    // Verify vendor exists
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, businessName')
      .eq('id', vendorId)
      .maybeSingle()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get count of pending areas first
    const { data: pendingAreas } = await supabase
      .from('vendor_service_areas')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('status', 'PENDING')

    const pendingCount = pendingAreas?.length || 0

    if (pendingCount === 0) {
      return NextResponse.json({
        success: true,
        data: { activated: 0 },
      })
    }

    // Bulk activate all PENDING areas
    const { error } = await supabase
      .from('vendor_service_areas')
      .update({
        status: 'ACTIVE',
        is_active: true,
        activated_at: new Date().toISOString(),
        activated_by: user.id,
        rejection_reason: null,
      })
      .eq('vendor_id', vendorId)
      .eq('status', 'PENDING')

    if (error) throw error

    // Audit log
    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: 'vendor_coverage_bulk_activate',
      entityType: 'vendor',
      entityId: vendorId,
      fieldChanged: 'vendor_service_areas.status',
      oldValue: { pendingCount },
      newValue: { status: 'ACTIVE', activated: pendingCount },
      reason: `Admin bulk-activated ${pendingCount} service areas for vendor`,
    })

    return NextResponse.json({
      success: true,
      data: { activated: pendingCount },
    })
  } catch (error) {
    console.error('Admin bulk-activate error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to bulk-activate service areas' },
      { status: 500 }
    )
  }
}
