import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// POST: Validate that cart product IDs are still active
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ success: true, data: { invalid: [] } })
    }

    const supabase = getSupabaseAdmin()

    const { data: activeProducts } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds)
      .eq('isActive', true)

    const activeIds = new Set((activeProducts || []).map((p: { id: string }) => p.id))
    const invalid = productIds.filter((id: string) => !activeIds.has(id))

    return NextResponse.json({ success: true, data: { invalid } })
  } catch (error) {
    console.error('POST /api/cart/validate error:', error)
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    )
  }
}
