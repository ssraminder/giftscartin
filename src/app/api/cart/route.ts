import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { addToCartSchema, updateCartItemSchema } from '@/lib/validations'

// GET: Fetch user's cart items
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: items, error } = await supabase
      .from('cart_items')
      .select('*, products(*, categories(id, name, slug))')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Cart fetch error:', error)
      throw error
    }

    // Reshape to match expected format: items[].product instead of items[].products
    const reshapedItems = (items || []).map((item: Record<string, unknown>) => ({
      ...item,
      product: item.products,
      products: undefined,
    }))

    // Fetch vendor preparation times for each product
    const productIds = reshapedItems.map((item: Record<string, unknown>) => (item.product as Record<string, unknown> | null)?.id as string).filter(Boolean)

    let maxPreparationTime = 120
    if (productIds.length > 0) {
      const { data: vendorProducts } = await supabase
        .from('vendor_products')
        .select('productId, preparationTime')
        .in('productId', productIds)
        .eq('isAvailable', true)

      if (vendorProducts && vendorProducts.length > 0) {
        // Group by product, take first available
        const prepTimeMap = new Map<string, number>()
        for (const vp of vendorProducts) {
          if (!prepTimeMap.has(vp.productId)) {
            prepTimeMap.set(vp.productId, vp.preparationTime)
          }
        }

        const prepTimes = reshapedItems.map(
          (item: Record<string, unknown>) =>
            prepTimeMap.get((item.product as Record<string, unknown> | null)?.id as string) ?? 120
        )
        maxPreparationTime = Math.max(...prepTimes, 120)
      }
    }

    return NextResponse.json({ success: true, data: { items: reshapedItems, maxPreparationTime } })
  } catch (error) {
    console.error('GET /api/cart error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

// POST: Add item to cart
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = addToCartSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { productId, quantity, addons, deliveryDate, deliverySlot } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify product exists and is active
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('isActive', true)
      .single()

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or unavailable' },
        { status: 404 }
      )
    }

    // Upsert cart item (update quantity if already in cart)
    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .upsert(
        {
          userId: user.id,
          productId,
          quantity,
          addons: addons ?? null,
          deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
          deliverySlot: deliverySlot ?? null,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: 'userId,productId' }
      )
      .select('*, products(*)')
      .single()

    if (error) {
      console.error('Cart upsert error:', error)
      throw error
    }

    // Reshape product relation
    const result = {
      ...cartItem,
      product: cartItem.products,
      products: undefined,
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/cart error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add item to cart' },
      { status: 500 }
    )
  }
}

// PUT: Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { cartItemId, ...rest } = body

    if (!cartItemId) {
      return NextResponse.json(
        { success: false, error: 'cartItemId is required' },
        { status: 400 }
      )
    }

    const parsed = updateCartItemSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { quantity } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify the cart item belongs to the user
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('id', cartItemId)
      .eq('userId', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      )
    }

    // If quantity is 0, delete the item
    if (quantity === 0) {
      await supabase.from('cart_items').delete().eq('id', cartItemId)
      return NextResponse.json({ success: true, data: null })
    }

    const { data: updated, error } = await supabase
      .from('cart_items')
      .update({ quantity, updatedAt: new Date().toISOString() })
      .eq('id', cartItemId)
      .select('*, products(*)')
      .single()

    if (error) {
      console.error('Cart update error:', error)
      throw error
    }

    const result = {
      ...updated,
      product: updated.products,
      products: undefined,
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('PUT /api/cart error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update cart item' },
      { status: 500 }
    )
  }
}

// DELETE: Remove item from cart (or clear cart)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl
    const cartItemId = searchParams.get('cartItemId')
    const supabase = getSupabaseAdmin()

    if (cartItemId) {
      // Delete specific item
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id')
        .eq('id', cartItemId)
        .eq('userId', user.id)
        .single()

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Cart item not found' },
          { status: 404 }
        )
      }

      await supabase.from('cart_items').delete().eq('id', cartItemId)
    } else {
      // Clear entire cart
      await supabase.from('cart_items').delete().eq('userId', user.id)
    }

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('DELETE /api/cart error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove cart item' },
      { status: 500 }
    )
  }
}
