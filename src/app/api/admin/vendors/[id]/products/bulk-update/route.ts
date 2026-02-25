import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const bulkUpdateSchema = z.object({
  vendorProductIds: z.array(z.string().min(1)).min(1, 'At least one vendor product ID required'),
  updates: z.object({
    isSameDayEligible: z.boolean().optional(),
    isExpressEligible: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  }).refine(
    (obj) => Object.values(obj).some((v) => v !== undefined),
    'At least one update field is required'
  ),
})

// PATCH: Bulk update eligibility flags on vendor products
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

    const { id: vendorId } = await params
    const body = await request.json()
    const parsed = bulkUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { vendorProductIds, updates } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify vendor exists
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', vendorId)
      .maybeSingle()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (updates.isSameDayEligible !== undefined) updateData.isSameDayEligible = updates.isSameDayEligible
    if (updates.isExpressEligible !== undefined) updateData.isExpressEligible = updates.isExpressEligible
    if (updates.isAvailable !== undefined) updateData.isAvailable = updates.isAvailable

    // Bulk update scoped to this vendor (security guard)
    const { data: updated, error } = await supabase
      .from('vendor_products')
      .update(updateData)
      .in('id', vendorProductIds)
      .eq('vendorId', vendorId)
      .select('id')

    if (error) throw error

    const updatedIds = (updated || []).map((row: { id: string }) => row.id)

    return NextResponse.json({
      success: true,
      data: {
        updated: updatedIds.length,
        ids: updatedIds,
      },
    })
  } catch (error) {
    console.error('Admin vendor bulk-update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update vendor products' },
      { status: 500 }
    )
  }
}
