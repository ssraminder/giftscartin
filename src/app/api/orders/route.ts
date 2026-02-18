import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { paginationSchema } from '@/lib/validations'
import { generateOrderNumber } from '@/lib/utils'
import { z } from 'zod/v4'

const inlineAddressSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone'),
  address: z.string().min(5).max(500),
  landmark: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
})

const createOrderBodySchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(10),
    addons: z.array(z.object({
      addonId: z.string(),
      name: z.string(),
      price: z.number(),
    })).optional(),
  })).min(1),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  deliverySlot: z.string().min(1, 'Delivery slot is required'),
  addressId: z.string().min(1),
  address: inlineAddressSchema.optional(),
  giftMessage: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
})

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

// POST: Create a new order
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
    const parsed = createOrderBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      items: orderItems,
      addressId,
      address: inlineAddress,
      deliveryDate,
      deliverySlot,
      giftMessage,
      specialInstructions,
      couponCode,
    } = parsed.data

    // Resolve address: create inline or look up existing
    let address
    if (inlineAddress && (addressId === 'inline' || addressId === '__CREATE__')) {
      address = await prisma.address.create({
        data: {
          userId: user.id,
          name: inlineAddress.name,
          phone: inlineAddress.phone,
          address: inlineAddress.address,
          landmark: inlineAddress.landmark || null,
          city: inlineAddress.city,
          state: inlineAddress.state,
          pincode: inlineAddress.pincode,
        },
      })
    } else {
      address = await prisma.address.findFirst({
        where: { id: addressId, userId: user.id },
      })
    }

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      )
    }

    // Verify each product exists and is active, calculate subtotal
    const productIds = orderItems.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id))
      const missing = productIds.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { success: false, error: `Products not found or inactive: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const productMap = new Map(products.map((p) => [p.id, p]))

    // Calculate subtotal from product basePrice * quantity
    let subtotal = 0
    const itemsForOrder = orderItems.map((item) => {
      const product = productMap.get(item.productId)!
      const basePrice = Number(product.basePrice)
      const addonTotal = item.addons?.reduce((sum, a) => sum + a.price, 0) ?? 0
      const lineTotal = (basePrice + addonTotal) * item.quantity
      subtotal += lineTotal

      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        price: product.basePrice,
        addons: item.addons ?? undefined,
      }
    })

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

    // Check for active delivery surcharges on deliveryDate
    let surcharge = 0
    const deliveryDateObj = new Date(deliveryDate)
    const surcharges = await prisma.deliverySurcharge.findMany({
      where: {
        isActive: true,
        startDate: { lte: deliveryDateObj },
        endDate: { gte: deliveryDateObj },
      },
    })

    for (const s of surcharges) {
      surcharge += Number(s.amount)
    }

    // Apply coupon discount
    let discount = 0
    let appliedCouponId: string | null = null
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
        // Check per-user limit
        const userUsage = await prisma.order.count({
          where: {
            userId: user.id,
            couponCode: coupon.code,
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
        })

        if (userUsage < coupon.perUserLimit) {
          if (coupon.discountType === 'percentage') {
            discount = (subtotal * Number(coupon.discountValue)) / 100
            if (coupon.maxDiscount) {
              discount = Math.min(discount, Number(coupon.maxDiscount))
            }
          } else {
            discount = Number(coupon.discountValue)
          }
          discount = Math.round(Math.min(discount, subtotal))
          appliedCouponId = coupon.id
        }
      }
    }

    const total = subtotal + deliveryCharge + surcharge - discount

    // Determine city code for order number
    const cityCode = zone?.city.slug.substring(0, 3).toUpperCase() || 'GEN'

    // Find best available vendor: pincode match, APPROVED, isOnline, sort by rating DESC
    const vendorPincode = await prisma.vendorPincode.findFirst({
      where: {
        pincode: address.pincode,
        isActive: true,
        vendor: { status: 'APPROVED' },
      },
      include: { vendor: true },
      orderBy: { vendor: { rating: 'desc' } },
    })

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(cityCode),
          userId: user.id,
          vendorId: vendorPincode?.vendor.id ?? null,
          addressId,
          deliveryDate: deliveryDateObj,
          deliverySlot,
          deliveryCharge,
          subtotal,
          discount,
          surcharge,
          total,
          giftMessage: giftMessage || null,
          specialInstructions: specialInstructions || null,
          couponCode: couponCode || null,
          items: {
            create: itemsForOrder,
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

      // Increment coupon usage if applied
      if (appliedCouponId) {
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: { usedCount: { increment: 1 } },
        })
      }

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
