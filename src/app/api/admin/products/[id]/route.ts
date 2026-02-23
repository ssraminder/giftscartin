import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

// ==================== GET — Single product with all relations ====================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(*)')
      .eq('id', params.id)
      .maybeSingle()

    if (error) throw error
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const [
      { data: variations },
      { data: addonGroups },
      { data: upsells },
      { data: vendorProducts },
      { data: attributes },
    ] = await Promise.all([
      supabase.from('product_variations').select('*').eq('productId', params.id).order('sortOrder', { ascending: true }),
      supabase.from('product_addon_groups').select('*, product_addon_options(*)').eq('productId', params.id).order('sortOrder', { ascending: true }),
      supabase.from('product_upsells').select('*, products!product_upsells_upsellProductId_fkey(id, name, slug, images, basePrice)').eq('productId', params.id).order('sortOrder', { ascending: true }),
      supabase.from('vendor_products').select('*, vendors!inner(id, businessName)').eq('productId', params.id),
      supabase.from('product_attributes').select('*, product_attribute_options(*)').eq('productId', params.id).order('sortOrder', { ascending: true }),
    ])

    const result = {
      ...product,
      category: product.categories,
      attributes: (attributes || []).map((a: Record<string, unknown>) => ({
        ...a,
        options: a.product_attribute_options || [],
      })),
      variations: variations || [],
      addonGroups: (addonGroups || []).map((g: Record<string, unknown>) => ({
        ...g,
        options: ((g.product_addon_options || []) as Record<string, unknown>[]).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
      })),
      upsells: (upsells || []).map((u: Record<string, unknown>) => ({
        ...u,
        upsellProduct: u.products,
      })),
      vendorProducts: (vendorProducts || []).map((vp: Record<string, unknown>) => ({
        ...vp,
        vendor: vp.vendors,
      })),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/admin/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// ==================== PUT — Update product ====================

const addonOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  price: z.number().default(0),
  image: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
})

const addonGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(['CHECKBOX', 'RADIO', 'SELECT', 'TEXT_INPUT', 'TEXTAREA', 'FILE_UPLOAD']),
  required: z.boolean().default(false),
  maxLength: z.number().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  acceptedFileTypes: z.array(z.string()).default([]),
  maxFileSizeMb: z.number().nullable().default(5),
  templateGroupId: z.string().nullable().optional(),
  isOverridden: z.boolean().default(false),
  sortOrder: z.number().default(0),
  options: z.array(addonOptionSchema).default([]),
})

const attributeOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1),
  sortOrder: z.number().default(0),
})

const attributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  isForVariations: z.boolean().default(true),
  sortOrder: z.number().default(0),
  options: z.array(attributeOptionSchema).default([]),
})

const variationSchema = z.object({
  id: z.string().optional(),
  attributes: z.record(z.string(), z.string()),
  price: z.number().min(0),
  salePrice: z.number().nullable().optional(),
  saleFrom: z.string().nullable().optional(),
  saleTo: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  stockQty: z.number().int().nullable().optional(),
  image: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  shortDesc: z.string().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  productType: z.enum(['SIMPLE', 'VARIABLE']).optional(),
  basePrice: z.number().min(0).optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  occasion: z.array(z.string()).optional(),
  weight: z.string().nullable().optional(),
  isVeg: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isSameDayEligible: z.boolean().optional(),
  // SEO
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.array(z.string()).optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  // AI-generated image pending upload
  pendingImageDataUrl: z.string().nullable().optional(),
  // Nested
  attributes: z.array(attributeSchema).optional(),
  variations: z.array(variationSchema).optional(),
  addonGroups: z.array(addonGroupSchema).optional(),
  upsellIds: z.array(z.string()).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Handle pending AI-generated image upload to Supabase
    let uploadedImageUrl: string | null = null
    if (data.pendingImageDataUrl?.startsWith('data:image/')) {
      try {
        const base64 = data.pendingImageDataUrl.split(',')[1]
        const imageBuffer = Buffer.from(base64, 'base64')
        const supabaseStorage = getSupabaseAdmin()
        const storagePath = `ai-generated/${Date.now()}-${(data.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`
        await supabaseStorage.storage.from('products').upload(storagePath, imageBuffer, { contentType: 'image/png' })
        const { data: urlData } = supabaseStorage.storage.from('products').getPublicUrl(storagePath)
        uploadedImageUrl = urlData.publicUrl
      } catch (err) {
        console.error('Pending image upload failed (non-fatal):', err)
      }
    }

    // If we uploaded an image, prepend it to images array and filter out data URLs
    if (uploadedImageUrl && data.images !== undefined) {
      data.images = [uploadedImageUrl, ...data.images.filter((img: string) => !img.startsWith('data:'))]
    } else if (data.images !== undefined) {
      data.images = data.images.filter((img: string) => !img.startsWith('data:'))
    }

    // Update product fields
    const productUpdate: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (data.name !== undefined) productUpdate.name = data.name
    if (data.slug !== undefined) productUpdate.slug = data.slug
    if (data.description !== undefined) productUpdate.description = data.description
    if (data.shortDesc !== undefined) productUpdate.shortDesc = data.shortDesc
    if (data.categoryId !== undefined) productUpdate.categoryId = data.categoryId
    if (data.productType !== undefined) productUpdate.productType = data.productType
    if (data.basePrice !== undefined) productUpdate.basePrice = data.basePrice
    if (data.images !== undefined) productUpdate.images = data.images
    if (data.tags !== undefined) productUpdate.tags = data.tags
    if (data.occasion !== undefined) productUpdate.occasion = data.occasion
    if (data.weight !== undefined) productUpdate.weight = data.weight
    if (data.isVeg !== undefined) productUpdate.isVeg = data.isVeg
    if (data.isActive !== undefined) productUpdate.isActive = data.isActive
    if (data.isSameDayEligible !== undefined) productUpdate.isSameDayEligible = data.isSameDayEligible
    if (data.metaTitle !== undefined) productUpdate.metaTitle = data.metaTitle
    if (data.metaDescription !== undefined) productUpdate.metaDescription = data.metaDescription
    if (data.metaKeywords !== undefined) productUpdate.metaKeywords = data.metaKeywords
    if (data.ogImage !== undefined) productUpdate.ogImage = data.ogImage
    if (data.canonicalUrl !== undefined) productUpdate.canonicalUrl = data.canonicalUrl

    if (Object.keys(productUpdate).length > 1) {
      await supabase.from('products').update(productUpdate).eq('id', params.id)
    }

    // Handle attributes — delete removed, upsert existing
    if (data.attributes !== undefined) {
      const incomingIds = data.attributes.filter((a) => a.id).map((a) => a.id!)

      // Delete removed attributes
      if (incomingIds.length > 0) {
        // Get all attribute IDs for this product, then delete those not in incomingIds
        const { data: existingAttrs } = await supabase
          .from('product_attributes')
          .select('id')
          .eq('productId', params.id)
          .not('id', 'in', `(${incomingIds.join(',')})`)
        if (existingAttrs && existingAttrs.length > 0) {
          await supabase.from('product_attributes').delete().in('id', existingAttrs.map(a => a.id))
        }
      } else {
        await supabase.from('product_attributes').delete().eq('productId', params.id)
      }

      for (const attr of data.attributes) {
        if (attr.id) {
          await supabase.from('product_attributes').update({
            name: attr.name,
            slug: attr.slug,
            isForVariations: attr.isForVariations,
            sortOrder: attr.sortOrder,
          }).eq('id', attr.id)

          // Handle options
          const optIds = attr.options.filter((o) => o.id).map((o) => o.id!)
          if (optIds.length > 0) {
            const { data: existingOpts } = await supabase
              .from('product_attribute_options')
              .select('id')
              .eq('attributeId', attr.id)
              .not('id', 'in', `(${optIds.join(',')})`)
            if (existingOpts && existingOpts.length > 0) {
              await supabase.from('product_attribute_options').delete().in('id', existingOpts.map(o => o.id))
            }
          } else {
            await supabase.from('product_attribute_options').delete().eq('attributeId', attr.id)
          }

          for (const opt of attr.options) {
            if (opt.id) {
              await supabase.from('product_attribute_options').update({
                value: opt.value,
                sortOrder: opt.sortOrder,
              }).eq('id', opt.id)
            } else {
              await supabase.from('product_attribute_options').insert({
                attributeId: attr.id,
                value: opt.value,
                sortOrder: opt.sortOrder,
              })
            }
          }
        } else {
          const { data: created } = await supabase
            .from('product_attributes')
            .insert({
              productId: params.id,
              name: attr.name,
              slug: attr.slug,
              isForVariations: attr.isForVariations,
              sortOrder: attr.sortOrder,
            })
            .select()
            .single()

          if (created) {
            for (const opt of attr.options) {
              await supabase.from('product_attribute_options').insert({
                attributeId: created.id,
                value: opt.value,
                sortOrder: opt.sortOrder,
              })
            }
          }
        }
      }
    }

    // Handle variations — delete removed, upsert existing
    if (data.variations !== undefined) {
      const incomingVarIds = data.variations.filter((v) => v.id).map((v) => v.id!)

      if (incomingVarIds.length > 0) {
        const { data: existingVars } = await supabase
          .from('product_variations')
          .select('id')
          .eq('productId', params.id)
          .not('id', 'in', `(${incomingVarIds.join(',')})`)
        if (existingVars && existingVars.length > 0) {
          await supabase.from('product_variations').delete().in('id', existingVars.map(v => v.id))
        }
      } else {
        await supabase.from('product_variations').delete().eq('productId', params.id)
      }

      for (const v of data.variations) {
        const varData = {
          attributes: v.attributes,
          price: v.price,
          salePrice: v.salePrice ?? null,
          saleFrom: v.saleFrom ? new Date(v.saleFrom).toISOString() : null,
          saleTo: v.saleTo ? new Date(v.saleTo).toISOString() : null,
          sku: v.sku ?? null,
          stockQty: v.stockQty ?? null,
          image: v.image ?? null,
          isActive: v.isActive,
          sortOrder: v.sortOrder,
          updatedAt: new Date().toISOString(),
        }
        if (v.id) {
          await supabase.from('product_variations').update(varData).eq('id', v.id)
        } else {
          await supabase.from('product_variations').insert({
            productId: params.id,
            ...varData,
          })
        }
      }
    }

    // Handle addon groups — delete removed, upsert existing
    if (data.addonGroups !== undefined) {
      const incomingGroupIds = data.addonGroups.filter((g) => g.id).map((g) => g.id!)

      if (incomingGroupIds.length > 0) {
        const { data: existingGroups } = await supabase
          .from('product_addon_groups')
          .select('id')
          .eq('productId', params.id)
          .not('id', 'in', `(${incomingGroupIds.join(',')})`)
        if (existingGroups && existingGroups.length > 0) {
          await supabase.from('product_addon_groups').delete().in('id', existingGroups.map(g => g.id))
        }
      } else {
        await supabase.from('product_addon_groups').delete().eq('productId', params.id)
      }

      for (const group of data.addonGroups) {
        const groupData = {
          name: group.name,
          description: group.description ?? null,
          type: group.type,
          required: group.required,
          maxLength: group.maxLength ?? null,
          placeholder: group.placeholder ?? null,
          acceptedFileTypes: group.acceptedFileTypes,
          maxFileSizeMb: group.maxFileSizeMb ?? 5,
          templateGroupId: group.templateGroupId ?? null,
          isOverridden: group.isOverridden,
          sortOrder: group.sortOrder,
          updatedAt: new Date().toISOString(),
        }

        if (group.id) {
          await supabase.from('product_addon_groups').update(groupData).eq('id', group.id)

          // Handle options
          const optIds = group.options.filter((o) => o.id).map((o) => o.id!)
          if (optIds.length > 0) {
            const { data: existingOpts } = await supabase
              .from('product_addon_options')
              .select('id')
              .eq('groupId', group.id)
              .not('id', 'in', `(${optIds.join(',')})`)
            if (existingOpts && existingOpts.length > 0) {
              await supabase.from('product_addon_options').delete().in('id', existingOpts.map(o => o.id))
            }
          } else {
            await supabase.from('product_addon_options').delete().eq('groupId', group.id)
          }

          for (const opt of group.options) {
            if (opt.id) {
              await supabase.from('product_addon_options').update({
                label: opt.label,
                price: opt.price,
                image: opt.image ?? null,
                isDefault: opt.isDefault,
                sortOrder: opt.sortOrder,
              }).eq('id', opt.id)
            } else {
              await supabase.from('product_addon_options').insert({
                groupId: group.id,
                label: opt.label,
                price: opt.price,
                image: opt.image ?? null,
                isDefault: opt.isDefault,
                sortOrder: opt.sortOrder,
              })
            }
          }
        } else {
          const { data: created } = await supabase
            .from('product_addon_groups')
            .insert({
              productId: params.id,
              ...groupData,
            })
            .select()
            .single()

          if (created) {
            for (const opt of group.options) {
              await supabase.from('product_addon_options').insert({
                groupId: created.id,
                label: opt.label,
                price: opt.price,
                image: opt.image ?? null,
                isDefault: opt.isDefault,
                sortOrder: opt.sortOrder,
              })
            }
          }
        }
      }
    }

    // Handle upsells — replace entire list
    if (data.upsellIds !== undefined) {
      await supabase.from('product_upsells').delete().eq('productId', params.id)
      for (let i = 0; i < data.upsellIds.length; i++) {
        await supabase.from('product_upsells').insert({
          productId: params.id,
          upsellProductId: data.upsellIds[i],
          sortOrder: i,
        })
      }
    }

    // Fetch updated product
    const { data: updatedProduct } = await supabase
      .from('products')
      .select('*, categories(*)')
      .eq('id', params.id)
      .single()

    const [
      { data: attrs },
      { data: vars },
      { data: groups },
      { data: ups },
    ] = await Promise.all([
      supabase.from('product_attributes').select('*, product_attribute_options(*)').eq('productId', params.id).order('sortOrder', { ascending: true }),
      supabase.from('product_variations').select('*').eq('productId', params.id).order('sortOrder', { ascending: true }),
      supabase.from('product_addon_groups').select('*, product_addon_options(*)').eq('productId', params.id).order('sortOrder', { ascending: true }),
      supabase.from('product_upsells').select('*, products!product_upsells_upsellProductId_fkey(id, name, slug, images, basePrice)').eq('productId', params.id),
    ])

    const updated = {
      ...updatedProduct,
      category: updatedProduct?.categories,
      attributes: (attrs || []).map((a: Record<string, unknown>) => ({ ...a, options: a.product_attribute_options || [] })),
      variations: vars || [],
      addonGroups: (groups || []).map((g: Record<string, unknown>) => ({
        ...g,
        options: ((g.product_addon_options || []) as Record<string, unknown>[]).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sortOrder as number) - (b.sortOrder as number)),
      })),
      upsells: (ups || []).map((u: Record<string, unknown>) => ({ ...u, upsellProduct: u.products })),
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/admin/products/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update product'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ==================== PATCH — Partial update product ====================

const patchProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  shortDesc: z.string().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  basePrice: z.number().min(0).optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  occasion: z.array(z.string()).optional(),
  weight: z.string().nullable().optional(),
  isVeg: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isSameDayEligible: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = patchProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const productUpdate: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (data.name !== undefined) productUpdate.name = data.name
    if (data.slug !== undefined) productUpdate.slug = data.slug
    if (data.description !== undefined) productUpdate.description = data.description
    if (data.shortDesc !== undefined) productUpdate.shortDesc = data.shortDesc
    if (data.categoryId !== undefined) productUpdate.categoryId = data.categoryId
    if (data.basePrice !== undefined) productUpdate.basePrice = data.basePrice
    if (data.images !== undefined) productUpdate.images = data.images
    if (data.tags !== undefined) productUpdate.tags = data.tags
    if (data.occasion !== undefined) productUpdate.occasion = data.occasion
    if (data.weight !== undefined) productUpdate.weight = data.weight
    if (data.isVeg !== undefined) productUpdate.isVeg = data.isVeg
    if (data.isActive !== undefined) productUpdate.isActive = data.isActive
    if (data.isSameDayEligible !== undefined) productUpdate.isSameDayEligible = data.isSameDayEligible

    if (Object.keys(productUpdate).length <= 1) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(productUpdate)
      .eq('id', params.id)
      .select('*, categories!inner(id, name, slug)')
      .single()

    if (error) throw error

    // Get vendor product count
    const { count: vpCount } = await supabase
      .from('vendor_products')
      .select('*', { count: 'exact', head: true })
      .eq('productId', params.id)

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        category: updated.categories,
        _count: { vendorProducts: vpCount ?? 0 },
      },
    })
  } catch (error) {
    console.error('PATCH /api/admin/products/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update product'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ==================== DELETE — Smart delete ====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const { count: vpCount } = await supabase
      .from('vendor_products')
      .select('*', { count: 'exact', head: true })
      .eq('productId', params.id)

    if ((vpCount ?? 0) > 0) {
      // Soft delete — vendors are linked
      await supabase.from('products').update({ isActive: false, updatedAt: new Date().toISOString() }).eq('id', params.id)
      return NextResponse.json({
        success: true,
        data: {
          deleted: false,
          reason: `Product deactivated (soft delete). ${vpCount} vendor(s) are linked to this product.`,
        },
      })
    } else {
      // Hard delete — no vendors linked
      await supabase.from('products').delete().eq('id', params.id)
      return NextResponse.json({
        success: true,
        data: { deleted: true },
      })
    }
  } catch (error) {
    console.error('DELETE /api/admin/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
