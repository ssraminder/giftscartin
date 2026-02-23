import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET: Fetch order details with items, address, payment, and status history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Fetch main order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // If user is logged in as a CUSTOMER, verify they own the order
    if (user && order.userId && order.userId !== user.id && user.role === 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this order' },
        { status: 403 }
      )
    }

    // Fetch order items with products and categories
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, products(id, name, slug, images, categories(name, slug))')
      .eq('orderId', id)

    // Reshape items: products -> product
    const items = (orderItems || []).map((item: Record<string, unknown>) => {
      const product = item.products as Record<string, unknown> | null
      return {
        ...item,
        product: product
          ? {
              id: product.id,
              name: product.name,
              slug: product.slug,
              images: product.images,
              category: product.categories || null,
            }
          : null,
        products: undefined,
      }
    })

    // Fetch address
    const { data: address } = order.addressId
      ? await supabase
          .from('addresses')
          .select('*')
          .eq('id', order.addressId)
          .single()
      : { data: null }

    // Fetch payment
    const { data: paymentRecords } = await supabase
      .from('payments')
      .select('*')
      .eq('orderId', id)
      .limit(1)

    const payment = paymentRecords && paymentRecords.length > 0 ? paymentRecords[0] : null

    // Fetch status history
    const { data: statusHistory } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('orderId', id)
      .order('createdAt', { ascending: false })

    // Fetch vendor info
    let vendor: Record<string, unknown> | null = null
    if (order.vendorId) {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id, businessName, phone')
        .eq('id', order.vendorId)
        .single()

      vendor = vendorData
    }

    // Build response matching the old format
    const responseData = {
      ...order,
      items,
      address,
      payment,
      statusHistory: statusHistory || [],
      vendor,
    }

    // Guest access: order IDs are UUIDs (unguessable), so allow
    // unauthenticated access for guest checkout confirmation flow
    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
