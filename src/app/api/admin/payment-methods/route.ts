import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

// GET: List all payment methods
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: methods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('sortOrder', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('GET /api/admin/payment-methods error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

// POST: Create a new payment method
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, slug, description, isActive, sortOrder } = body

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A payment method with this slug already exists' },
        { status: 400 }
      )
    }

    const { data: method, error } = await supabase
      .from('payment_methods')
      .insert({
        name,
        slug,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: method })
  } catch (error) {
    console.error('POST /api/admin/payment-methods error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment method' },
      { status: 500 }
    )
  }
}
