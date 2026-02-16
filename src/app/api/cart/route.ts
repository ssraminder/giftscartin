import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { addToCartSchema, updateCartItemSchema } from '@/lib/validations'

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user as { id: string; role: string; email: string }
}

// GET: Fetch user's cart items
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const items = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            addons: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: items })
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
    const user = await getSessionUser()
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

    // Verify product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or unavailable' },
        { status: 404 }
      )
    }

    // Upsert cart item (update quantity if already in cart)
    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_productId: { userId: user.id, productId },
      },
      update: {
        quantity,
        addons: addons ?? undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        deliverySlot: deliverySlot ?? undefined,
      },
      create: {
        userId: user.id,
        productId,
        quantity,
        addons: addons ?? undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        deliverySlot: deliverySlot ?? null,
      },
      include: {
        product: true,
      },
    })

    return NextResponse.json({ success: true, data: cartItem }, { status: 201 })
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
    const user = await getSessionUser()
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

    // Verify the cart item belongs to the user
    const existing = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      )
    }

    // If quantity is 0, delete the item
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } })
      return NextResponse.json({ success: true, data: null })
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true },
    })

    return NextResponse.json({ success: true, data: updated })
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
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl
    const cartItemId = searchParams.get('cartItemId')

    if (cartItemId) {
      // Delete specific item
      const existing = await prisma.cartItem.findFirst({
        where: { id: cartItemId, userId: user.id },
      })

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Cart item not found' },
          { status: 404 }
        )
      }

      await prisma.cartItem.delete({ where: { id: cartItemId } })
    } else {
      // Clear entire cart
      await prisma.cartItem.deleteMany({ where: { userId: user.id } })
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
