import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  orderTotal: z.number().min(0),
  userId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = validateCouponSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { code, orderTotal } = parsed.data

    // Get userId from session if not provided
    const session = await getServerSession(authOptions)
    const userId = parsed.data.userId || session?.user?.id

    // Find coupon by code
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: 'Invalid coupon code' },
      })
    }

    // Check date validity
    const now = new Date()
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: 'This coupon has expired' },
      })
    }

    // Check global usage limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: 'This coupon has reached its usage limit' },
      })
    }

    // Check minimum order amount
    if (orderTotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          message: `Minimum order of ₹${Number(coupon.minOrderAmount)} required for this coupon`,
        },
      })
    }

    // Check per-user usage limit
    if (userId && coupon.perUserLimit > 0) {
      const userUsageCount = await prisma.order.count({
        where: {
          userId,
          couponCode: coupon.code,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      })

      if (userUsageCount >= coupon.perUserLimit) {
        return NextResponse.json({
          success: true,
          data: { valid: false, message: 'You have already used this coupon' },
        })
      }
    }

    // Calculate discount
    let discount = 0
    if (coupon.discountType === 'percentage') {
      discount = (orderTotal * Number(coupon.discountValue)) / 100
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount))
      }
    } else {
      discount = Number(coupon.discountValue)
    }

    // Ensure discount doesn't exceed order total
    discount = Math.min(discount, orderTotal)
    discount = Math.round(discount)

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        discount,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
        message: `Coupon applied! You save ₹${discount}`,
      },
    })
  } catch (error) {
    console.error('POST /api/coupons/validate error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
