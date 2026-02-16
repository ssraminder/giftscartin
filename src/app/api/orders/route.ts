import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { createOrderSchema, paginationSchema } from '@/lib/validations'
import { generateOrderNumber } from '@/lib/utils'

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user as { id: string; role: string; email: string }
}

// GET: List user's orders
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = paginationSchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { page, pageSize } = parsed.data
    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
          address: true,
        },
      }),
      prisma.order.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      success: true,
      data: { items, total, page, pageSize },
    })
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST: Create a new order from cart
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
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { addressId, deliveryDate, deliverySlot, giftMessage, specialInstructions, couponCode } =
      parsed.data

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: user.id },
    })

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      )
    }

    // Fetch cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true },
    })

    if (cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      )
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = Number(item.product.basePrice) * item.quantity
      const addonTotal = Array.isArray(item.addons)
        ? (item.addons as Array<{ price: number }>).reduce((a, addon) => a + addon.price, 0) *
          item.quantity
        : 0
      return sum + itemPrice + addonTotal
    }, 0)

    // Calculate delivery charge based on pincode zone
    let deliveryCharge = 0
    const zone = await prisma.cityZone.findFirst({
      where: { pincodes: { has: address.pincode }, isActive: true },
      include: { city: true },
    })

    if (zone) {
      const cityCharge = Number(zone.city.baseDeliveryCharge)
      const zoneExtra = Number(zone.extraCharge)
      deliveryCharge = subtotal >= Number(zone.city.freeDeliveryAbove) ? 0 : cityCharge + zoneExtra

      // Add slot-specific charge
      const slotConfig = await prisma.cityDeliveryConfig.findFirst({
        where: { cityId: zone.city.id, slot: { slug: deliverySlot } },
        include: { slot: true },
      })
      if (slotConfig) {
        deliveryCharge += Number(slotConfig.chargeOverride ?? slotConfig.slot.baseCharge)
      }
    }

    // Apply coupon discount
    let discount = 0
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      })

      if (
        coupon &&
        coupon.isActive &&
        new Date() >= coupon.validFrom &&
        new Date() <= coupon.validUntil &&
        subtotal >= Number(coupon.minOrderAmount) &&
        (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)
      ) {
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * Number(coupon.discountValue)) / 100
          if (coupon.maxDiscount) {
            discount = Math.min(discount, Number(coupon.maxDiscount))
          }
        } else {
          discount = Number(coupon.discountValue)
        }

        // Increment coupon usage
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        })
      }
    }

    const total = subtotal + deliveryCharge - discount

    // Determine city code for order number
    const cityCode = zone?.city.slug.substring(0, 3).toUpperCase() || 'GEN'

    // Find an available vendor for the pincode
    const vendorPincode = await prisma.vendorPincode.findFirst({
      where: {
        pincode: address.pincode,
        isActive: true,
        vendor: { status: 'APPROVED' },
      },
      include: { vendor: true },
    })

    // Create order within a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(cityCode),
          userId: user.id,
          vendorId: vendorPincode?.vendor.id ?? null,
          addressId,
          deliveryDate: new Date(deliveryDate),
          deliverySlot,
          deliveryCharge,
          subtotal,
          discount,
          surcharge: 0,
          total,
          giftMessage,
          specialInstructions,
          couponCode,
          items: {
            create: cartItems.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.basePrice,
              addons: item.addons ?? undefined,
            })),
          },
          statusHistory: {
            create: {
              status: 'PENDING',
              note: 'Order placed',
            },
          },
        },
        include: {
          items: true,
          address: true,
          statusHistory: true,
        },
      })

      // Clear the user's cart
      await tx.cartItem.deleteMany({ where: { userId: user.id } })

      return newOrder
    })

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
