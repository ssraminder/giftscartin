import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { generateOrderNumber } from '@/lib/utils'
import { z } from 'zod/v4'

const adminOrderSchema = z.object({
  customerPhone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid phone'),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email().optional(),
  deliveryDate: z.string().min(1),
  deliverySlot: z.string().min(1),
  deliveryAddress: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid phone'),
    address: z.string().min(5).max(500),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  }),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
    variationId: z.string().optional(),
    variationLabel: z.string().optional(),
    addons: z.any().optional(),
  })).min(1),
  paymentMethod: z.enum(['CASH', 'PAID_ONLINE', 'PENDING']),
  vendorId: z.string().optional(),
  giftMessage: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
  deliveryCharge: z.number().min(0).default(0),
  surcharge: z.number().min(0).default(0),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = adminOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // 1. Find or create user by phone — handle email uniqueness conflicts
    let user = await prisma.user.findUnique({
      where: { phone: data.customerPhone },
    })

    if (!user) {
      // If email is provided, check if another user already has it
      if (data.customerEmail) {
        const existingByEmail = await prisma.user.findUnique({
          where: { email: data.customerEmail },
        })
        if (existingByEmail) {
          // Email belongs to another user — create without email to avoid unique constraint violation
          user = await prisma.user.create({
            data: {
              phone: data.customerPhone,
              name: data.customerName,
            },
          })
        } else {
          user = await prisma.user.create({
            data: {
              phone: data.customerPhone,
              name: data.customerName,
              email: data.customerEmail,
            },
          })
        }
      } else {
        user = await prisma.user.create({
          data: {
            phone: data.customerPhone,
            name: data.customerName,
          },
        })
      }
    }

    // 2. Validate all product IDs exist before creating the order
    const productIds = data.items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })

    const foundProductIds = new Set(products.map((p) => p.id))
    const missingIds = productIds.filter((id) => !foundProductIds.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `Products not found: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    // 3. Create address record
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        name: data.deliveryAddress.name,
        phone: data.deliveryAddress.phone,
        address: data.deliveryAddress.address,
        city: data.deliveryAddress.city,
        state: data.deliveryAddress.state,
        pincode: data.deliveryAddress.pincode,
      },
    })

    // 4. Calculate subtotal from items
    let subtotal = 0
    const productNameMap = new Map(products.map((p) => [p.id, p.name]))
    const itemsForOrder = data.items.map((item) => {
      const lineTotal = item.price * item.quantity
      subtotal += lineTotal
      return {
        productId: item.productId,
        name: productNameMap.get(item.productId) || 'Unknown Product',
        quantity: item.quantity,
        price: item.price,
        variationId: item.variationId || null,
        variationLabel: item.variationLabel || null,
        addons: item.addons ?? undefined,
      }
    })

    // 5. Apply coupon if provided
    let discount = 0
    let appliedCouponId: string | null = null
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode },
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
        discount = Math.round(Math.min(discount, subtotal))
        appliedCouponId = coupon.id
      }
    }

    // 6. Find/assign vendor if not specified
    let vendorId: string | null = data.vendorId || null

    if (!vendorId) {
      // Try variation-level matching first
      const orderVariationIds = data.items
        .map((item) => item.variationId)
        .filter((id): id is string => !!id)

      if (orderVariationIds.length > 0) {
        const vendorPincodes = await prisma.vendorPincode.findMany({
          where: {
            pincode: data.deliveryAddress.pincode,
            isActive: true,
            vendor: { status: 'APPROVED' },
          },
          include: {
            vendor: {
              include: {
                productVariations: {
                  where: {
                    variationId: { in: orderVariationIds },
                    isAvailable: true,
                  },
                },
              },
            },
          },
          orderBy: { vendor: { rating: 'desc' } },
        })

        for (const vp of vendorPincodes) {
          const availableVariationIds = new Set(
            vp.vendor.productVariations.map((pv) => pv.variationId)
          )
          const hasAll = orderVariationIds.every((vid) => availableVariationIds.has(vid))
          if (hasAll) {
            vendorId = vp.vendor.id
            break
          }
        }
      }

      // Fallback: product-level vendor matching
      if (!vendorId) {
        const vendorPincode = await prisma.vendorPincode.findFirst({
          where: {
            pincode: data.deliveryAddress.pincode,
            isActive: true,
            vendor: { status: 'APPROVED' },
          },
          include: { vendor: true },
          orderBy: { vendor: { rating: 'desc' } },
        })
        vendorId = vendorPincode?.vendor.id ?? null
      }
    }

    // 7. Generate order number with collision retry
    const zone = await prisma.cityZone.findFirst({
      where: { pincodes: { has: data.deliveryAddress.pincode }, isActive: true },
      include: { city: true },
    })
    const cityCode = zone?.city.slug.substring(0, 3).toUpperCase() || 'GEN'

    let orderNumber = generateOrderNumber(cityCode)
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      })
      if (!existing) break
      orderNumber = generateOrderNumber(cityCode)
    }

    // 8. Determine order status
    const orderStatus = vendorId ? 'CONFIRMED' : 'PENDING'

    // Calculate total
    const deliveryCharge = data.deliveryCharge
    const surchargeAmount = data.surcharge
    const total = subtotal + deliveryCharge + surchargeAmount - discount

    // 9. Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        vendorId,
        addressId: address.id,
        deliveryDate: new Date(data.deliveryDate),
        deliverySlot: data.deliverySlot,
        deliveryCharge,
        subtotal,
        discount,
        surcharge: surchargeAmount,
        total,
        status: orderStatus,
        paymentStatus: data.paymentMethod === 'PENDING' ? 'PENDING' : 'PAID',
        paymentMethod: data.paymentMethod,
        giftMessage: data.giftMessage || null,
        specialInstructions: data.specialInstructions || null,
        couponCode: data.couponCode || null,
        items: {
          create: itemsForOrder,
        },
        statusHistory: {
          create: {
            status: orderStatus,
            note: `Manual order created by admin (${session.user.email || session.user.id})`,
            changedBy: session.user.id,
          },
        },
      },
      include: {
        items: true,
        address: true,
        statusHistory: true,
      },
    })

    // 10. Create payment record for CASH or PAID_ONLINE
    if (data.paymentMethod === 'CASH' || data.paymentMethod === 'PAID_ONLINE') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          currency: 'INR',
          gateway: data.paymentMethod === 'CASH' ? 'COD' : 'RAZORPAY',
          method: data.paymentMethod === 'CASH' ? 'cash' : 'online',
          status: 'PAID',
        },
      })
    }

    // 11. Increment coupon usage
    if (appliedCouponId) {
      await prisma.coupon.update({
        where: { id: appliedCouponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Re-fetch with payment included
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } },
        address: true,
        statusHistory: true,
        payment: true,
      },
    })

    return NextResponse.json({ success: true, data: fullOrder }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('POST /api/admin/orders/create error:', message, error)
    return NextResponse.json(
      { success: false, error: `Failed to create order: ${message}` },
      { status: 500 }
    )
  }
}
