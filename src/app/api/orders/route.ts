import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getSupabase } from '@/lib/supabase'
import { isAdminRole } from '@/lib/roles'
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

const addonSelectionSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  type: z.string(),
  selectedIds: z.array(z.string()).optional(),
  selectedLabels: z.array(z.string()).optional(),
  totalAddonPrice: z.number().optional(),
  selectedId: z.string().optional(),
  selectedLabel: z.string().optional(),
  addonPrice: z.number().optional(),
  text: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
})

const createOrderBodySchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(10),
    variationId: z.string().optional(),
    addons: z.union([
      z.array(addonSelectionSchema),
      z.array(z.object({
        addonId: z.string(),
        name: z.string(),
        price: z.number(),
      })),
    ]).optional(),
  })).min(1),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  deliverySlot: z.string().min(1, 'Delivery slot is required'),
  addressId: z.string().min(1),
  address: inlineAddressSchema.optional(),
  senderName: z.string().max(100).optional(),
  senderPhone: z.string().regex(/^\d{10}$/, 'Invalid phone').optional(),
  senderEmail: z.string().email().max(200).optional(),
  occasion: z.string().max(100).optional(),
  giftMessage: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
  partnerId: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
})

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user as { id: string; role: string; email: string }
}

// Smart vendor assignment — slot, capacity, hours, holiday aware
async function findBestVendor(
  cityId: string,
  pincode: string,
  productIds: string[],
  slotId: string,
  deliveryDate: Date,
  requiredLeadTimeHours: number
): Promise<string | null> {
  const dayOfWeek = deliveryDate.getDay()
  const dateOnly  = new Date(deliveryDate.toISOString().split('T')[0])

  const vendorPincodes = await prisma.vendorPincode.findMany({
    where: { pincode, isActive: true },
    select: { vendorId: true },
  })
  const candidateIds = vendorPincodes.map(vp => vp.vendorId)
  if (candidateIds.length === 0) return null

  const vendors = await prisma.vendor.findMany({
    where: {
      id:      { in: candidateIds },
      cityId,
      status:  'APPROVED',
      isOnline: true,
      OR: [
        { vacationStart: null },
        { vacationEnd:   { lt: new Date() } },
        { vacationStart: { gt: new Date() } },
      ],
    },
    include: {
      workingHours: { where: { dayOfWeek } },
      slots:        { where: { slotId, isEnabled: true } },
      holidays:     { where: { date: dateOnly } },
      capacity:     { where: { date: dateOnly, slotId } },
      products:     { where: { productId: { in: productIds }, isAvailable: true } },
    },
  })

  const eligible = vendors.filter(vendor => {
    // Must stock all ordered products
    const vendorProductIds = vendor.products.map(vp => vp.productId)
    if (!productIds.every(pid => vendorProductIds.includes(pid))) return false

    // Must offer this slot
    if (vendor.slots.length === 0) return false

    // Must be open today
    const workDay = vendor.workingHours[0]
    if (!workDay || workDay.isClosed) return false

    // Must not be on holiday for this slot
    const holiday = vendor.holidays[0]
    if (holiday) {
      const overrides = (holiday.blockedSlots ?? []) as string[]
      // blockedSlots = [] means full day blocked; otherwise check if slotId is listed
      if (overrides.length === 0 || overrides.includes(slotId)) return false
    }

    // Must have capacity
    const cap = vendor.capacity[0]
    if (cap && cap.bookedOrders >= cap.maxOrders) return false

    // Must meet product lead time
    const maxPrep = Math.max(...vendor.products.map(vp => vp.preparationTime))
    if (Math.ceil(maxPrep / 60) > requiredLeadTimeHours) return false

    return true
  })

  if (eligible.length === 0) return null

  // Rank: highest rating first, then fewest booked orders
  eligible.sort((a, b) => {
    const rDiff = Number(b.rating) - Number(a.rating)
    if (rDiff !== 0) return rDiff
    return (a.capacity[0]?.bookedOrders ?? 0) - (b.capacity[0]?.bookedOrders ?? 0)
  })

  const best = eligible[0]

  // Increment booked orders atomically
  await prisma.vendorCapacity.upsert({
    where:  { vendorId_date_slotId: { vendorId: best.id, date: dateOnly, slotId } },
    update: { bookedOrders: { increment: 1 } },
    create: { vendorId: best.id, date: dateOnly, slotId, maxOrders: 10, bookedOrders: 1 },
  })

  return best.id
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

    const isAdmin = isAdminRole(user.role)
    const where = isAdmin ? {} : { userId: user.id }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
      prisma.order.count({ where }),
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
    const isGuest = !user

    const body = await request.json()
    console.log('Order creation attempt:', JSON.stringify(body, null, 2))
    const parsed = createOrderBodySchema.safeParse(body)

    if (!parsed.success) {
      console.log('Zod validation failed:', JSON.stringify(parsed.error.issues, null, 2))
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const {
      items: orderItems,
      addressId,
      address: inlineAddress,
      deliveryDate,
      deliverySlot,
      senderName,
      senderPhone,
      senderEmail,
      occasion,
      giftMessage,
      specialInstructions,
      couponCode,
      partnerId: bodyPartnerId,
      guestEmail,
      guestPhone,
    } = parsed.data

    // Guests must provide email + phone
    if (isGuest) {
      if (!guestEmail || !guestPhone) {
        return NextResponse.json(
          { success: false, error: 'Please provide your email and phone to place a guest order' },
          { status: 400 }
        )
      }
    }

    // Resolve partner: prefer body partnerId, fallback to gci_ref cookie
    let partnerId = bodyPartnerId || null
    if (!partnerId) {
      const refCode = request.cookies.get('gci_ref')?.value ?? null
      if (refCode) {
        try {
          const partner = await prisma.partner.findUnique({
            where: { refCode, isActive: true },
            select: { id: true },
          })
          if (partner) {
            partnerId = partner.id
          }
        } catch {
          // Non-critical: ignore referral lookup errors
        }
      }
    }

    // Resolve address: create inline or look up existing
    let address
    if (inlineAddress && (addressId === 'inline' || addressId === '__CREATE__')) {
      address = await prisma.address.create({
        data: {
          userId: isGuest ? null : user!.id,
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
        where: isGuest
          ? { id: addressId }
          : { id: addressId, userId: user!.id },
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
      include: {
        variations: { where: { isActive: true } },
      },
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

    // Fetch variation IDs for items that have them
    const variationIds = orderItems
      .map((item) => item.variationId)
      .filter((id): id is string => !!id)

    const variationMap = new Map<string, typeof products[0]['variations'][0]>()
    if (variationIds.length > 0) {
      const variations = await prisma.productVariation.findMany({
        where: { id: { in: variationIds }, isActive: true },
      })
      for (const v of variations) {
        variationMap.set(v.id, v)
      }
    }

    // Calculate subtotal from product/variation prices
    let subtotal = 0
    const itemsForOrder = orderItems.map((item) => {
      const product = productMap.get(item.productId)!
      let unitPrice = Number(product.basePrice)
      let variationLabel: string | null = null

      // Use variation price if variationId is provided
      if (item.variationId) {
        const variation = variationMap.get(item.variationId)
        if (variation) {
          // Check for active sale price
          const now = new Date()
          const hasSale = variation.salePrice &&
            (!variation.saleFrom || variation.saleFrom <= now) &&
            (!variation.saleTo || variation.saleTo >= now)
          unitPrice = Number(hasSale ? variation.salePrice : variation.price)
          // Build variation label from attributes
          const attrs = variation.attributes as Record<string, string>
          variationLabel = Object.values(attrs).join(', ')
        }
      }

      // Calculate addon total from the new addon format
      let addonTotal = 0
      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          if ('totalAddonPrice' in addon && typeof addon.totalAddonPrice === 'number') {
            addonTotal += addon.totalAddonPrice
          } else if ('addonPrice' in addon && typeof addon.addonPrice === 'number') {
            addonTotal += addon.addonPrice
          } else if ('price' in addon && typeof addon.price === 'number') {
            addonTotal += addon.price
          }
        }
      }

      const lineTotal = (unitPrice + addonTotal) * item.quantity
      subtotal += lineTotal

      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        price: unitPrice,
        variationId: item.variationId || null,
        variationLabel,
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
        let couponAllowed = true
        if (!isGuest) {
          const userUsage = await prisma.order.count({
            where: {
              userId: user!.id,
              couponCode: coupon.code,
              status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
          })
          if (userUsage >= coupon.perUserLimit) couponAllowed = false
        } else if (guestEmail) {
          const guestUsage = await prisma.order.count({
            where: {
              guestEmail,
              couponCode: coupon.code,
              status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
          })
          if (guestUsage >= coupon.perUserLimit) couponAllowed = false
        }

        if (couponAllowed) {
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

    // Derive effective lead time from ordered products
    const orderedProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { minLeadTimeHours: true },
    })
    const requiredLeadTimeHours = Math.max(...orderedProducts.map(p => p.minLeadTimeHours), 2)

    // Find best vendor using smart assignment (slot, capacity, hours, holiday aware)
    let bestVendorId: string | null = null

    if (zone) {
      // Look up the delivery slot record by slug to get its ID
      const slotRecord = await prisma.deliverySlot.findUnique({
        where: { slug: deliverySlot },
      })
      if (slotRecord) {
        bestVendorId = await findBestVendor(
          zone.city.id,
          address.pincode,
          productIds,
          slotRecord.id,
          deliveryDateObj,
          requiredLeadTimeHours
        )
      }
    }

    // Fallback: simple pincode-based vendor matching
    if (!bestVendorId) {
      const vendorPincode = await prisma.vendorPincode.findFirst({
        where: {
          pincode: address.pincode,
          isActive: true,
          vendor: { status: 'APPROVED' },
        },
        include: { vendor: true },
        orderBy: { vendor: { rating: 'desc' } },
      })
      bestVendorId = vendorPincode?.vendor.id ?? null
    }

    // Sequential queries (no interactive transaction — pgbouncer compatible)

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(cityCode),
        userId: isGuest ? null : user!.id,
        guestEmail: isGuest ? guestEmail : null,
        guestPhone: isGuest ? guestPhone : null,
        vendorId: bestVendorId,
        partnerId: partnerId || null,
        addressId: address.id,
        deliveryDate: deliveryDateObj,
        deliverySlot,
        deliveryCharge,
        subtotal,
        discount,
        surcharge,
        total,
        senderName: senderName || null,
        senderPhone: senderPhone || null,
        senderEmail: senderEmail || null,
        occasion: occasion || null,
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

    // Create partner earning if partner is set
    if (partnerId) {
      try {
        const partnerRecord = await prisma.partner.findUnique({
          where: { id: partnerId },
          select: { commissionPercent: true },
        })
        if (partnerRecord) {
          const earningAmount = (Number(order.total) * Number(partnerRecord.commissionPercent)) / 100
          await prisma.partnerEarning.create({
            data: {
              partnerId,
              orderId: order.id,
              amount: earningAmount,
              status: 'pending',
            },
          })
        }
      } catch (partnerErr) {
        // Non-critical: log but don't fail the order
        console.error('Partner earning creation error:', partnerErr)
      }
    }

    // Move FILE_UPLOAD addon files from pending/ to orders/{orderId}/
    try {
      const supabase = getSupabase()
      for (const item of orderItems) {
        if (!item.addons) continue
        for (const addon of item.addons) {
          if ('fileUrl' in addon && addon.fileUrl && typeof addon.fileUrl === 'string') {
            // Extract the pending/ path from the signed URL
            const urlObj = new URL(addon.fileUrl)
            const pathMatch = urlObj.pathname.match(/pending\/([^?]+)/)
            if (pathMatch) {
              const pendingPath = `pending/${pathMatch[1]}`
              const groupId = 'groupId' in addon ? addon.groupId : 'unknown'
              const filename = pendingPath.split('/').pop() || 'file'
              const newPath = `orders/${order.id}/${groupId}/${filename}`

              // Move file: copy then delete
              const { error: copyError } = await supabase.storage
                .from('order-uploads')
                .copy(pendingPath, newPath)

              if (!copyError) {
                await supabase.storage
                  .from('order-uploads')
                  .remove([pendingPath])
              }
            }
          }
        }
      }
    } catch (storageErr) {
      // Non-critical: log but don't fail the order
      console.error('File move error:', storageErr)
    }

    // Increment coupon usage if applied
    if (appliedCouponId) {
      await prisma.coupon.update({
        where: { id: appliedCouponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Clear the user's cart (only for logged-in users; guest cart is Zustand client-side)
    if (!isGuest) {
      await prisma.cartItem.deleteMany({ where: { userId: user!.id } })
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
