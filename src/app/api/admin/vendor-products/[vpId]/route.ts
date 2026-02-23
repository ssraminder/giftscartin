import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const updateSchema = z.object({
  costPrice: z.number().min(0).optional(),
  preparationTime: z.number().int().min(0).optional(),
  dailyLimit: z.number().int().min(1).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isSameDayEligible: z.boolean().optional(),
})

// PATCH: Update vendor product fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vpId: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { vpId } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('vendor_products')
      .select('id')
      .eq('id', vpId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor product not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (parsed.data.costPrice !== undefined) data.costPrice = parsed.data.costPrice
    if (parsed.data.preparationTime !== undefined) data.preparationTime = parsed.data.preparationTime
    if (parsed.data.dailyLimit !== undefined) data.dailyLimit = parsed.data.dailyLimit
    if (parsed.data.isAvailable !== undefined) data.isAvailable = parsed.data.isAvailable
    if (parsed.data.isSameDayEligible !== undefined) data.isSameDayEligible = parsed.data.isSameDayEligible

    const { data: updated, error } = await supabase
      .from('vendor_products')
      .update(data)
      .eq('id', vpId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        costPrice: Number(updated.costPrice),
        sellingPrice: updated.sellingPrice ? Number(updated.sellingPrice) : null,
        preparationTime: updated.preparationTime,
        dailyLimit: updated.dailyLimit,
        isAvailable: updated.isAvailable,
        isSameDayEligible: updated.isSameDayEligible,
      },
    })
  } catch (error) {
    console.error('Admin vendor-product PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor product' },
      { status: 500 }
    )
  }
}

// DELETE: Hard delete vendor_product record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vpId: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { vpId } = await params
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('vendor_products')
      .select('id')
      .eq('id', vpId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor product not found' },
        { status: 404 }
      )
    }

    await supabase.from('vendor_products').delete().eq('id', vpId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin vendor-product DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove vendor product' },
      { status: 500 }
    )
  }
}
