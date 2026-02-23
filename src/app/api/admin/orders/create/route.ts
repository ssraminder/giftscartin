import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
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
    const sessionUser = await getSessionFromRequest(request)
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = adminOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data
    const supabase = getSupabaseAdmin()

    // 1. Find or create user by phone
    let { data: user } = await supabase.from('users').select('*').eq('phone', data.customerPhone).maybeSingle()
    if (!user) {
      if (data.customerEmail) {
        const { data: existingByEmail } = await supabase.from('users').select('id').eq('email', data.customerEmail).maybeSingle()
        if (existingByEmail) {
          const { data: created } = await supabase.from('users').insert({ phone: data.customerPhone, name: data.customerName }).select().single()
          user = created
        } else {
          const { data: created } = await supabase.from('users').insert({ phone: data.customerPhone, name: data.customerName, email: data.customerEmail }).select().single()
          user = created
        }
      } else {
        const { data: created } = await supabase.from('users').insert({ phone: data.customerPhone, name: data.customerName }).select().single()
        user = created
      }
    }
    if (!user) throw new Error('Failed to create/find user')

    // 2. Validate products
    const productIds = data.items.map((i) => i.productId)
    const { data: products } = await supabase.from('products').select('id, name').in('id', productIds)
    const foundProductIds = new Set((products || []).map((p) => p.id))
    const missingIds = productIds.filter((pid) => !foundProductIds.has(pid))
    if (missingIds.length > 0) {
      return NextResponse.json({ success: false, error: `Products not found: ${missingIds.join(', ')}` }, { status: 400 })
    }

    // 3. Create address
    const { data: address, error: addrErr } = await supabase.from('addresses').insert({
      userId: user.id, name: data.deliveryAddress.name, phone: data.deliveryAddress.phone,
      address: data.deliveryAddress.address, city: data.deliveryAddress.city,
      state: data.deliveryAddress.state, pincode: data.deliveryAddress.pincode,
    }).select().single()
    if (addrErr) throw addrErr

    // 4. Calculate subtotal
    let subtotal = 0
    const productNameMap = new Map((products || []).map((p) => [p.id, p.name]))
    const itemsForOrder = data.items.map((item) => {
      subtotal += item.price * item.quantity
      return { productId: item.productId, name: productNameMap.get(item.productId) || 'Unknown', quantity: item.quantity, price: item.price, variationId: item.variationId || null, variationLabel: item.variationLabel || null, addons: item.addons ?? null }
    })

    // 5. Coupon
    let discount = 0
    let appliedCouponId: string | null = null
    if (data.couponCode) {
      const { data: coupon } = await supabase.from('coupons').select('*').eq('code', data.couponCode).maybeSingle()
      if (coupon?.isActive && new Date() >= new Date(coupon.validFrom) && new Date() <= new Date(coupon.validUntil) && subtotal >= Number(coupon.minOrderAmount) && (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)) {
        discount = coupon.discountType === 'percentage' ? (subtotal * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue)
        if (coupon.discountType === 'percentage' && coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount))
        discount = Math.round(Math.min(discount, subtotal))
        appliedCouponId = coupon.id
      }
    }

    // 6. Vendor matching
    let vendorId: string | null = data.vendorId || null
    if (!vendorId) {
      const { data: vps } = await supabase.from('vendor_pincodes').select('vendorId').eq('pincode', data.deliveryAddress.pincode).eq('isActive', true)
      for (const vp of (vps || [])) {
        const { data: v } = await supabase.from('vendors').select('id').eq('id', vp.vendorId).eq('status', 'APPROVED').maybeSingle()
        if (v) { vendorId = v.id; break }
      }
    }

    // 7. Order number
    const { data: zone } = await supabase.from('city_zones').select('*, cities!inner(slug)').contains('pincodes', [data.deliveryAddress.pincode]).eq('isActive', true).limit(1).maybeSingle()
    const cityCode = zone?.cities?.slug?.substring(0, 3).toUpperCase() || 'GEN'
    let orderNumber = generateOrderNumber(cityCode)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: existing } = await supabase.from('orders').select('id').eq('orderNumber', orderNumber).maybeSingle()
      if (!existing) break
      orderNumber = generateOrderNumber(cityCode)
    }

    const orderStatus = vendorId ? 'CONFIRMED' : 'PENDING'
    const total = subtotal + data.deliveryCharge + data.surcharge - discount

    // 8. Create order
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      orderNumber, userId: user.id, vendorId, addressId: address.id,
      deliveryDate: new Date(data.deliveryDate).toISOString(), deliverySlot: data.deliverySlot,
      deliveryCharge: data.deliveryCharge, subtotal, discount, surcharge: data.surcharge, total,
      status: orderStatus, paymentStatus: data.paymentMethod === 'PENDING' ? 'PENDING' : 'PAID',
      paymentMethod: data.paymentMethod, giftMessage: data.giftMessage || null,
      specialInstructions: data.specialInstructions || null, couponCode: data.couponCode || null,
    }).select().single()
    if (orderErr) throw orderErr

    for (const item of itemsForOrder) { await supabase.from('order_items').insert({ orderId: order.id, ...item }) }
    await supabase.from('order_status_history').insert({ orderId: order.id, status: orderStatus, note: `Manual order by admin (${sessionUser.email || sessionUser.id})`, changedBy: sessionUser.id })
    if (data.paymentMethod !== 'PENDING') { await supabase.from('payments').insert({ orderId: order.id, amount: total, currency: 'INR', gateway: data.paymentMethod === 'CASH' ? 'COD' : 'RAZORPAY', method: data.paymentMethod === 'CASH' ? 'cash' : 'online', status: 'PAID' }) }
    if (appliedCouponId) { const { data: c } = await supabase.from('coupons').select('usedCount').eq('id', appliedCouponId).single(); if (c) await supabase.from('coupons').update({ usedCount: (c.usedCount || 0) + 1 }).eq('id', appliedCouponId) }

    const { data: fullOrder } = await supabase.from('orders').select('*').eq('id', order.id).single()
    const { data: orderItems } = await supabase.from('order_items').select('*, products(id, name, slug, images)').eq('orderId', order.id)
    const { data: orderAddr } = await supabase.from('addresses').select('*').eq('id', order.addressId).single()
    const { data: statusHistory } = await supabase.from('order_status_history').select('*').eq('orderId', order.id)
    const { data: payment } = await supabase.from('payments').select('*').eq('orderId', order.id).maybeSingle()

    return NextResponse.json({ success: true, data: { ...fullOrder, items: (orderItems || []).map((i: Record<string, unknown>) => ({ ...i, product: i.products })), address: orderAddr, statusHistory: statusHistory || [], payment } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('POST /api/admin/orders/create error:', message, error)
    return NextResponse.json({ success: false, error: `Failed to create order: ${message}` }, { status: 500 })
  }
}
