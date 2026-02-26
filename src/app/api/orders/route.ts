import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase'
import { isAdminRole } from '@/lib/roles'
import { paginationSchema } from '@/lib/validations'
import { generateOrderNumber } from '@/lib/utils'
import { getPlatformSurcharges, calculatePlatformSurcharge } from '@/lib/surcharge'
import { z } from 'zod/v4'

const inlineAddressSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid phone'),
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
  senderPhone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone').optional(),
  senderEmail: z.string().email().max(200).optional(),
  occasion: z.string().max(100).optional(),
  giftMessage: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
  partnerId: z.string().optional(),
  paymentMethod: z.enum(['upi', 'card', 'netbanking', 'cod']).optional(),
  guestEmail: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  guestPhone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
})

// Smart vendor assignment -- slot, capacity, hours, holiday aware
async function findBestVendor(
  cityId: string,
  pincode: string,
  productIds: string[],
  slotId: string,
  deliveryDate: Date,
  requiredLeadTimeHours: number
): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const dayOfWeek = deliveryDate.getDay()
  const dateOnly = new Date(deliveryDate.toISOString().split('T')[0]).toISOString()


  // Find vendors serving this pincode
  const { data: vendorPincodes } = await supabase
    .from('vendor_pincodes')
    .select('vendorId')
    .eq('pincode', pincode)
    .eq('isActive', true)

  const candidateIds = (vendorPincodes || []).map((vp: { vendorId: string }) => vp.vendorId)
  if (candidateIds.length === 0) return null

  // Fetch approved, online vendors in this city (not on vacation)
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, rating')
    .in('id', candidateIds)
    .eq('cityId', cityId)
    .eq('status', 'APPROVED')
    .eq('isOnline', true)

  if (!vendors || vendors.length === 0) return null

  // Filter out vendors currently on vacation
  const activeVendors: Array<{ id: string; rating: unknown }> = []
  for (const vendor of vendors) {
    const { data: vendorFull } = await supabase
      .from('vendors')
      .select('vacationStart, vacationEnd')
      .eq('id', vendor.id)
      .single()

    if (vendorFull) {
      const onVacation =
        vendorFull.vacationStart &&
        vendorFull.vacationEnd &&
        new Date(vendorFull.vacationStart) <= new Date() &&
        new Date(vendorFull.vacationEnd) >= new Date()
      if (!onVacation) {
        activeVendors.push(vendor)
      }
    }
  }

  if (activeVendors.length === 0) return null

  const activeVendorIds = activeVendors.map((v) => v.id)

  // Fetch working hours for today
  const { data: workingHours } = await supabase
    .from('vendor_working_hours')
    .select('vendorId, isClosed')
    .in('vendorId', activeVendorIds)
    .eq('dayOfWeek', dayOfWeek)

  const workingHoursMap = new Map(
    (workingHours || []).map((wh: { vendorId: string; isClosed: boolean }) => [wh.vendorId, wh])
  )

  // Fetch slot assignments
  const { data: vendorSlots } = await supabase
    .from('vendor_slots')
    .select('vendorId')
    .in('vendorId', activeVendorIds)
    .eq('slotId', slotId)
    .eq('isEnabled', true)

  const vendorsWithSlot = new Set(
    (vendorSlots || []).map((vs: { vendorId: string }) => vs.vendorId)
  )

  // Fetch holidays
  const { data: holidays } = await supabase
    .from('vendor_holidays')
    .select('vendorId, blockedSlots')
    .in('vendorId', activeVendorIds)
    .eq('date', dateOnly)

  const holidayMap = new Map(
    (holidays || []).map((h: { vendorId: string; blockedSlots: string[] | null }) => [h.vendorId, h])
  )

  // Fetch capacity
  const { data: capacities } = await supabase
    .from('vendor_capacity')
    .select('vendorId, maxOrders, bookedOrders')
    .in('vendorId', activeVendorIds)
    .eq('date', dateOnly)
    .eq('slotId', slotId)

  const capacityMap = new Map(
    (capacities || []).map((c: { vendorId: string; maxOrders: number; bookedOrders: number }) => [c.vendorId, c])
  )

  // Fetch vendor products
  const { data: vendorProducts } = await supabase
    .from('vendor_products')
    .select('vendorId, productId, preparationTime')
    .in('vendorId', activeVendorIds)
    .in('productId', productIds)
    .eq('isAvailable', true)

  // Group vendor products by vendorId
  const vendorProductMap = new Map<string, Array<{ productId: string; preparationTime: number }>>()
  for (const vp of vendorProducts || []) {
    const existing = vendorProductMap.get(vp.vendorId) || []
    existing.push({ productId: vp.productId, preparationTime: vp.preparationTime })
    vendorProductMap.set(vp.vendorId, existing)
  }

  // Filter eligible vendors
  const eligible: Array<{ id: string; rating: unknown; bookedOrders: number }> = []
  for (const vendor of activeVendors) {
    const vProducts = vendorProductMap.get(vendor.id) || []
    const vendorProductIds = vProducts.map((vp) => vp.productId)

    // Must stock all ordered products
    if (!productIds.every((pid) => vendorProductIds.includes(pid))) continue

    // Must offer this slot
    if (!vendorsWithSlot.has(vendor.id)) continue

    // Must be open today
    const workDay = workingHoursMap.get(vendor.id)
    if (!workDay || workDay.isClosed) continue

    // Must not be on holiday for this slot
    const holiday = holidayMap.get(vendor.id)
    if (holiday) {
      const overrides = (holiday.blockedSlots ?? []) as string[]
      if (overrides.length === 0 || overrides.includes(slotId)) continue
    }

    // Must have capacity
    const cap = capacityMap.get(vendor.id)
    if (cap && cap.bookedOrders >= cap.maxOrders) continue

    // Must meet product lead time
    const maxPrep = Math.max(...vProducts.map((vp) => vp.preparationTime))
    if (Math.ceil(maxPrep / 60) > requiredLeadTimeHours) continue

    eligible.push({
      ...vendor,
      bookedOrders: cap?.bookedOrders ?? 0,
    })
  }

  if (eligible.length === 0) return null

  // Rank: highest rating first, then fewest booked orders
  eligible.sort((a, b) => {
    const rDiff = Number(b.rating) - Number(a.rating)
    if (rDiff !== 0) return rDiff
    return a.bookedOrders - b.bookedOrders
  })

  const best = eligible[0]

  // Increment booked orders atomically via upsert
  const existingCap = capacityMap.get(best.id)
  if (existingCap) {
    await supabase
      .from('vendor_capacity')
      .update({ bookedOrders: existingCap.bookedOrders + 1, updatedAt: new Date().toISOString() })
      .eq('vendorId', best.id)
      .eq('date', dateOnly)
      .eq('slotId', slotId)
  } else {
    await supabase
      .from('vendor_capacity')
      .insert({
        vendorId: best.id,
        date: dateOnly,
        slotId,
        maxOrders: 10,
        bookedOrders: 1,
      })
  }

  return best.id
}

// GET: List user's orders
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
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
    const supabase = getSupabaseAdmin()
    const isAdmin = isAdminRole(user.role)

    // Build the query
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(id, name, slug, images)), addresses(*)')
      .order('createdAt', { ascending: false })
      .range(skip, skip + pageSize - 1)

    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (!isAdmin) {
      query = query.eq('userId', user.id)
      countQuery = countQuery.eq('userId', user.id)
    }

    const [{ data: items, error: itemsError }, { count: total, error: countError }] = await Promise.all([
      query,
      countQuery,
    ])

    if (itemsError) {
      console.error('Orders query error:', itemsError)
      throw itemsError
    }
    if (countError) {
      console.error('Orders count error:', countError)
      throw countError
    }

    // Reshape: order_items -> items, addresses -> address
    const reshapedItems = (items || []).map((order: Record<string, unknown>) => ({
      ...order,
      items: ((order.order_items as Array<Record<string, unknown>>) || []).map((item) => ({
        ...item,
        product: item.products,
        products: undefined,
      })),
      order_items: undefined,
      address: order.addresses,
      addresses: undefined,
    }))

    return NextResponse.json({
      success: true,
      data: { items: reshapedItems, total: total || 0, page, pageSize },
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
    const user = await getSessionFromRequest(request)
    const isGuest = !user

    const body = await request.json()
    const parsed = createOrderBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
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
      paymentMethod,
      guestEmail,
      guestPhone,
    } = parsed.data

    const supabase = getSupabaseAdmin()

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
          const { data: partner } = await supabase
            .from('partners')
            .select('id')
            .eq('refCode', refCode)
            .eq('isActive', true)
            .single()

          if (partner) {
            partnerId = partner.id
          }
        } catch {
          // Non-critical: ignore referral lookup errors
        }
      }
    }

    // Resolve address: create inline or look up existing
    let address: Record<string, unknown> | null = null
    if (inlineAddress && (addressId === 'inline' || addressId === '__CREATE__')) {
      const { data: newAddress, error: addrError } = await supabase
        .from('addresses')
        .insert({
          userId: isGuest ? null : user!.id,
          name: inlineAddress.name,
          phone: inlineAddress.phone,
          address: inlineAddress.address,
          landmark: inlineAddress.landmark || null,
          city: inlineAddress.city,
          state: inlineAddress.state,
          pincode: inlineAddress.pincode,
        })
        .select()
        .single()

      if (addrError) {
        console.error('Address creation error:', addrError)
        throw addrError
      }
      address = newAddress
    } else {
      let addrQuery = supabase.from('addresses').select('*').eq('id', addressId)
      if (!isGuest) {
        addrQuery = addrQuery.eq('userId', user!.id)
      }
      const { data: existingAddress } = await addrQuery.single()
      address = existingAddress
    }

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      )
    }

    // Verify each product exists and is active, calculate subtotal
    const productIds = orderItems.map((item) => item.productId)
    const { data: products } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .in('id', productIds)
      .eq('isActive', true)

    if (!products || products.length !== productIds.length) {
      const foundIds = new Set((products || []).map((p: { id: string }) => p.id))
      const missing = productIds.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { success: false, error: `Products not found or inactive: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const productMap = new Map(products.map((p: Record<string, unknown>) => [p.id as string, p]))

    // Fetch variation IDs for items that have them
    const variationIds = orderItems
      .map((item) => item.variationId)
      .filter((id): id is string => !!id)

    const variationMap = new Map<string, Record<string, unknown>>()
    if (variationIds.length > 0) {
      const { data: variations } = await supabase
        .from('product_variations')
        .select('*')
        .in('id', variationIds)
        .eq('isActive', true)

      for (const v of variations || []) {
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
            (!variation.saleFrom || new Date(variation.saleFrom as string) <= now) &&
            (!variation.saleTo || new Date(variation.saleTo as string) >= now)
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
        name: product.name as string,
        quantity: item.quantity,
        price: unitPrice,
        variationId: item.variationId || null,
        variationLabel,
        addons: item.addons ?? null,
      }
    })

    // Calculate delivery charge based on pincode zone
    let deliveryCharge = 0
    const { data: zone } = await supabase
      .from('city_zones')
      .select('*, cities(*)')
      .contains('pincodes', [address.pincode as string])
      .eq('isActive', true)
      .limit(1)
      .single()

    if (zone) {
      const city = zone.cities as Record<string, unknown>
      const cityCharge = Number(city.baseDeliveryCharge)
      const zoneExtra = Number(zone.extraCharge)
      deliveryCharge = subtotal >= Number(city.freeDeliveryAbove) ? 0 : cityCharge + zoneExtra

      // Add slot-specific charge — find matching slot config by slug
      const { data: slotConfigs } = await supabase
        .from('city_delivery_configs')
        .select('chargeOverride, delivery_slots(slug, baseCharge)')
        .eq('cityId', (city as { id: string }).id)

      if (slotConfigs) {
        const matchingConfig = slotConfigs.find((sc: Record<string, unknown>) => {
          const slot = sc.delivery_slots as { slug: string } | null
          return slot?.slug === deliverySlot
        })
        if (matchingConfig) {
          const slot = matchingConfig.delivery_slots as unknown as { baseCharge: unknown }
          deliveryCharge += Number(matchingConfig.chargeOverride ?? slot.baseCharge)
        }
      }
    }

    // Server-side surcharge computation (never trust client values)
    let surcharge = 0
    let vendorAreaSurcharge = 0
    let platformSurchargeTotal = 0
    const deliveryDateObj = new Date(deliveryDate)

    // Get cityId from the resolved zone (needed for platform surcharges)
    const surchargesCityId = zone ? (zone.cities as { id: string }).id : null

    // 1. Platform surcharges — fetch and filter by slot + product categories
    if (surchargesCityId) {
      const rawSurcharges = await getPlatformSurcharges(deliveryDateObj, surchargesCityId)

      // Resolve category slugs for ordered products so category-specific surcharges apply
      const categoryIds: string[] = []
      const productCategoryIds = products
        .map((p: Record<string, unknown>) => p.categoryId as string)
        .filter(Boolean)
      if (productCategoryIds.length > 0) {
        const { data: cats } = await supabase
          .from('categories')
          .select('slug')
          .in('id', productCategoryIds)
        for (const c of cats || []) {
          if (c.slug) categoryIds.push(c.slug)
        }
      }

      const platformResult = calculatePlatformSurcharge(rawSurcharges, deliverySlot, categoryIds)
      platformSurchargeTotal = platformResult.total
    }

    // Apply coupon discount
    let discount = 0
    let appliedCouponId: string | null = null
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .single()

      if (
        coupon &&
        coupon.isActive &&
        new Date() >= new Date(coupon.validFrom) &&
        new Date() <= new Date(coupon.validUntil) &&
        subtotal >= Number(coupon.minOrderAmount) &&
        (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)
      ) {
        // Check per-user limit
        let couponAllowed = true
        if (!isGuest) {
          const { count: userUsage } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('userId', user!.id)
            .eq('couponCode', coupon.code)
            .not('status', 'in', '("CANCELLED","REFUNDED")')

          if ((userUsage || 0) >= coupon.perUserLimit) couponAllowed = false
        } else if (guestEmail) {
          const { count: guestUsage } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('guestEmail', guestEmail)
            .eq('couponCode', coupon.code)
            .not('status', 'in', '("CANCELLED","REFUNDED")')

          if ((guestUsage || 0) >= coupon.perUserLimit) couponAllowed = false
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

    // Add COD fee if payment method is cash on delivery
    const codFee = paymentMethod === 'cod' ? 50 : 0
    // Preliminary total (vendor area surcharge added after vendor assignment below)
    let total = subtotal + deliveryCharge + platformSurchargeTotal + codFee - discount

    // Determine city code for order number
    const cityCode = zone
      ? ((zone.cities as { slug: string }).slug).substring(0, 3).toUpperCase()
      : 'GEN'

    // Derive effective lead time from ordered products
    const orderedProducts = products.filter((p: { id: string }) => productIds.includes(p.id))
    const requiredLeadTimeHours = Math.max(
      ...orderedProducts.map((p: { minLeadTimeHours: number }) => p.minLeadTimeHours),
      2
    )

    // Find best vendor using smart assignment (slot, capacity, hours, holiday aware)
    let bestVendorId: string | null = null

    if (zone) {
      // Look up the delivery slot record by slug to get its ID
      const { data: slotRecord } = await supabase
        .from('delivery_slots')
        .select('id')
        .eq('slug', deliverySlot)
        .single()

      if (slotRecord) {
        bestVendorId = await findBestVendor(
          (zone.cities as { id: string }).id,
          address.pincode as string,
          productIds,
          slotRecord.id,
          deliveryDateObj,
          requiredLeadTimeHours
        )
      }
    }

    // Fallback: simple pincode-based vendor matching
    if (!bestVendorId) {
      const { data: vendorPincodes } = await supabase
        .from('vendor_pincodes')
        .select('vendorId, vendors(id, rating, status)')
        .eq('pincode', address.pincode as string)
        .eq('isActive', true)

      // Find the best approved vendor
      const approvedEntries = (vendorPincodes || []).filter(
        (vp: Record<string, unknown>) => {
          const vendor = vp.vendors as { status: string } | null
          return vendor?.status === 'APPROVED'
        }
      )

      if (approvedEntries.length > 0) {
        approvedEntries.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const aVendor = a.vendors as unknown as { rating: unknown }
          const bVendor = b.vendors as unknown as { rating: unknown }
          return Number(bVendor.rating) - Number(aVendor.rating)
        })
        bestVendorId = (approvedEntries[0].vendors as unknown as { id: string }).id
      }
    }

    // Add vendor-specific pincode delivery surcharge
    if (bestVendorId && address.pincode) {
      const { data: vpCharge } = await supabase
        .from('vendor_pincodes')
        .select('deliveryCharge')
        .eq('vendorId', bestVendorId)
        .eq('pincode', address.pincode as string)
        .maybeSingle()

      if (vpCharge && Number(vpCharge.deliveryCharge) > 0) {
        deliveryCharge += Number(vpCharge.deliveryCharge)
      }
    }

    // 2. Vendor area surcharge — from vendor_service_areas for the resolved vendor + pincode
    if (bestVendorId && address.pincode) {
      // Find the service area matching the delivery pincode
      const { data: serviceArea } = await supabase
        .from('service_areas')
        .select('id')
        .eq('pincode', address.pincode as string)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (serviceArea) {
        const { data: vsa } = await supabase
          .from('vendor_service_areas')
          .select('delivery_surcharge')
          .eq('vendor_id', bestVendorId)
          .eq('service_area_id', serviceArea.id)
          .eq('status', 'ACTIVE')
          .eq('is_active', true)
          .maybeSingle()

        if (vsa && Number(vsa.delivery_surcharge) > 0) {
          vendorAreaSurcharge = Number(vsa.delivery_surcharge)
        }
      }
    }

    // Total surcharge = vendor area surcharge + platform surcharge
    surcharge = vendorAreaSurcharge + platformSurchargeTotal

    // Recalculate total with updated delivery charge and surcharges
    total = subtotal + deliveryCharge + surcharge + codFee - discount

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        orderNumber: generateOrderNumber(cityCode),
        userId: isGuest ? null : user!.id,
        guestEmail: isGuest ? guestEmail : null,
        guestPhone: isGuest ? guestPhone : null,
        vendorId: bestVendorId,
        partnerId: partnerId || null,
        addressId: address.id as string,
        deliveryDate: deliveryDateObj.toISOString(),
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
        paymentMethod: paymentMethod || null,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw orderError
    }

    // Insert order items
    const orderItemRecords = itemsForOrder.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      variationId: item.variationId,
      variationLabel: item.variationLabel,
      addons: item.addons,
    }))

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemRecords)
      .select()

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
    }

    // --- Order created successfully. Everything below is non-critical. ---
    // Each post-creation operation is wrapped in its own try-catch with a
    // 5-second timeout (via Promise.race) so that an ETIMEDOUT on any single
    // external call does NOT cause the overall order response to fail with 500.

    /** Race a thenable against a 5-second timeout. Rejects with an Error on timeout. */
    const raceTimeout = <T>(thenable: PromiseLike<T>, label: string, ms = 5000): Promise<T> =>
      Promise.race([
        Promise.resolve(thenable),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ])

    // Non-critical: Insert status history entry
    let statusHistory: Record<string, unknown>[] | null = null
    try {
      const { data, error: statusError } = await raceTimeout(
        supabase
          .from('order_status_history')
          .insert({ orderId: order.id, status: 'PENDING', note: 'Order placed' })
          .select(),
        'Status history insert'
      )
      if (statusError) {
        console.error('[orders] Status history insert error (non-fatal):', statusError)
      } else {
        statusHistory = data
      }
    } catch (e) {
      console.error('[orders] Status history insert failed (non-fatal):', e)
    }

    // Non-critical: Fetch the address for the response
    let orderAddress: Record<string, unknown> | null = null
    try {
      const { data } = await raceTimeout(
        supabase
          .from('addresses')
          .select('*')
          .eq('id', order.addressId)
          .single(),
        'Address fetch'
      )
      orderAddress = data
    } catch (e) {
      console.error('[orders] Address fetch for response failed (non-fatal):', e)
    }

    // Non-critical: Create partner earning if partner is set
    if (partnerId) {
      try {
        const { data: partnerRecord } = await raceTimeout(
          supabase
            .from('partners')
            .select('commissionPercent')
            .eq('id', partnerId)
            .single(),
          'Partner lookup'
        )

        if (partnerRecord) {
          const earningAmount = (Number(order.total) * Number(partnerRecord.commissionPercent)) / 100
          await raceTimeout(
            supabase
              .from('partner_earnings')
              .insert({
                partnerId,
                orderId: order.id,
                amount: earningAmount,
                status: 'pending',
              }),
            'Partner earning insert'
          )
        }
      } catch (partnerErr) {
        console.error('[orders] Partner earning creation failed (non-fatal):', partnerErr)
      }
    }

    // Non-critical: Move FILE_UPLOAD addon files from pending/ to orders/{orderId}/
    try {
      await raceTimeout(
        (async () => {
          const storageClient = getSupabase()
          for (const item of orderItems) {
            if (!item.addons) continue
            for (const addon of item.addons) {
              if ('fileUrl' in addon && addon.fileUrl && typeof addon.fileUrl === 'string') {
                const urlObj = new URL(addon.fileUrl)
                const pathMatch = urlObj.pathname.match(/pending\/([^?]+)/)
                if (pathMatch) {
                  const pendingPath = `pending/${pathMatch[1]}`
                  const groupId = 'groupId' in addon ? addon.groupId : 'unknown'
                  const filename = pendingPath.split('/').pop() || 'file'
                  const newPath = `orders/${order.id}/${groupId}/${filename}`

                  const { error: copyError } = await storageClient.storage
                    .from('order-uploads')
                    .copy(pendingPath, newPath)

                  if (!copyError) {
                    await storageClient.storage
                      .from('order-uploads')
                      .remove([pendingPath])
                  }
                }
              }
            }
          }
        })(),
        'File move'
      )
    } catch (storageErr) {
      console.error('[orders] File move failed (non-fatal):', storageErr)
    }

    // Non-critical: Increment coupon usage if applied
    if (appliedCouponId) {
      try {
        const { data: currentCoupon } = await raceTimeout(
          supabase
            .from('coupons')
            .select('usedCount')
            .eq('id', appliedCouponId)
            .single(),
          'Coupon fetch'
        )

        if (currentCoupon) {
          await raceTimeout(
            supabase
              .from('coupons')
              .update({
                usedCount: (currentCoupon.usedCount || 0) + 1,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', appliedCouponId),
            'Coupon usage update'
          )
        }
      } catch (e) {
        console.error('[orders] Coupon usage increment failed (non-fatal):', e)
      }
    }

    // Non-critical: Clear the user's cart (only for logged-in users; guest cart is Zustand client-side)
    if (!isGuest) {
      try {
        await raceTimeout(
          supabase.from('cart_items').delete().eq('userId', user!.id),
          'Cart clear'
        )
      } catch (e) {
        console.error('[orders] Cart clearing failed (non-fatal):', e)
      }
    }

    // Build response matching old format
    const fullOrder = {
      ...order,
      items: createdItems || [],
      address: orderAddress,
      statusHistory: statusHistory || [],
    }

    return NextResponse.json({ success: true, data: fullOrder }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
