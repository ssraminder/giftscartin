"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product, AddonSelectionRecord } from "@/types"

export interface CartItemState {
  id: string
  productId: string
  productName: string
  productSlug: string
  image: string
  quantity: number
  price: number // unit price (variation price or base price)
  variationId: string | null
  selectedAttributes: Record<string, string> | null
  addonSelections: AddonSelectionRecord[]
  deliveryDate: string | null
  deliverySlot: string | null
  deliveryWindow: string | null
  deliveryCharge: number
  product: Product
}

export interface CartAddResult {
  success: boolean
  reason?: string
  message?: string
}

interface CartStore {
  items: CartItemState[]
  couponCode: string | null
  couponDiscount: number
  addItem: (product: Product, quantity?: number, legacyAddons?: { addonId: string; name: string; price: number }[], legacyVariation?: { variationId: string; type: string; label: string; price: number } | null) => CartAddResult
  addItemAdvanced: (params: {
    product: Product
    quantity: number
    price: number
    variationId: string | null
    selectedAttributes: Record<string, string> | null
    addonSelections: AddonSelectionRecord[]
    deliveryDate?: string | null
    deliverySlot?: string | null
    deliveryWindow?: string | null
    deliveryCharge?: number
  }) => CartAddResult
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateDelivery: (itemId: string, date: string | null, slot: string | null, window?: string | null, charge?: number) => void
  setDeliveryDateForAll: (date: string | null) => void
  setCoupon: (code: string | null, discount: number) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
}

function generateCartItemId(): string {
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function calculateAddonTotal(addonSelections: AddonSelectionRecord[]): number {
  let total = 0
  for (const addon of addonSelections) {
    if (addon.totalAddonPrice !== undefined) {
      total += addon.totalAddonPrice
    } else if (addon.addonPrice !== undefined) {
      total += addon.addonPrice
    }
  }
  return total
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,

      // Legacy addItem for backward compatibility with old addon/variation model
      addItem: (product, quantity = 1, legacyAddons = [], legacyVariation = null) => {
        const normalizedProduct = { ...product, basePrice: Number(product.basePrice) }
        const unitPrice = legacyVariation ? Number(legacyVariation.price) : normalizedProduct.basePrice

        // Convert legacy addons to AddonSelectionRecord format
        const addonSelections: AddonSelectionRecord[] = legacyAddons.map((a) => ({
          groupId: a.addonId,
          groupName: a.name,
          type: "CHECKBOX" as const,
          addonPrice: Number(a.price),
        }))

        // Cart mixing validation — legacy addItem is always "standard" (no deliverySlot)
        const currentItems = Array.isArray(get().items) ? get().items : []
        const hasExpressItems = currentItems.some(item => item.deliverySlot === 'express')
        if (hasExpressItems) {
          return {
            success: false,
            reason: 'standard_conflict',
            message: 'Your cart has an express order. Express items must be checked out separately.',
          }
        }

        set((state) => {
          const items = Array.isArray(state.items) ? state.items : []
          // For legacy calls, match by productId (simple dedup)
          const existing = items.find((i) => i.productId === normalizedProduct.id)
          if (existing) {
            return {
              items: items.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          return {
            items: [
              ...items,
              {
                id: generateCartItemId(),
                productId: normalizedProduct.id,
                productName: normalizedProduct.name,
                productSlug: normalizedProduct.slug,
                image: normalizedProduct.images?.[0] || "/placeholder-product.svg",
                quantity,
                price: unitPrice,
                variationId: legacyVariation?.variationId || null,
                selectedAttributes: null,
                addonSelections,
                deliveryDate: null,
                deliverySlot: null,
                deliveryWindow: null,
                deliveryCharge: 0,
                product: normalizedProduct,
              },
            ],
          }
        })
        return { success: true }
      },

      // New addItemAdvanced for Phase D with full variation + addon group support
      addItemAdvanced: ({ product, quantity, price, variationId, selectedAttributes, addonSelections, deliveryDate, deliverySlot, deliveryWindow, deliveryCharge }) => {
        const normalizedProduct = { ...product, basePrice: Number(product.basePrice) }
        const isExpressItem = deliverySlot === 'express'

        // Cart mixing validation
        const currentItems = Array.isArray(get().items) ? get().items : []
        const hasExpressItems = currentItems.some(item => item.deliverySlot === 'express')
        const hasStandardItems = currentItems.some(item => item.deliverySlot !== 'express')

        if (isExpressItem && hasStandardItems && currentItems.length > 0) {
          return {
            success: false,
            reason: 'express_conflict',
            message: 'Express items must be ordered separately. Complete or clear your current cart first.',
          }
        }

        if (!isExpressItem && hasExpressItems && currentItems.length > 0) {
          return {
            success: false,
            reason: 'standard_conflict',
            message: 'Your cart has an express order. Express items must be checked out separately.',
          }
        }

        set((state) => {
          const items = Array.isArray(state.items) ? state.items : []
          return {
            items: [
              ...items,
              {
                id: generateCartItemId(),
                productId: normalizedProduct.id,
                productName: normalizedProduct.name,
                productSlug: normalizedProduct.slug,
                image: normalizedProduct.images?.[0] || "/placeholder-product.svg",
                quantity,
                price: Number(price),
                variationId,
                selectedAttributes,
                addonSelections,
                deliveryDate: deliveryDate ?? null,
                deliverySlot: deliverySlot ?? null,
                deliveryWindow: deliveryWindow ?? null,
                deliveryCharge: deliveryCharge ?? 0,
                product: normalizedProduct,
              },
            ],
          }
        })
        return { success: true }
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).filter((i) => i.id !== itemId),
        }))
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId)
          return
        }
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        }))
      },

      updateDelivery: (itemId, date, slot, window = null, charge = 0) => {
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).map((i) =>
            i.id === itemId
              ? { ...i, deliveryDate: date, deliverySlot: slot, deliveryWindow: window ?? null, deliveryCharge: charge }
              : i
          ),
        }))
      },

      setDeliveryDateForAll: (date) => {
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).map((i) => ({
            ...i,
            deliveryDate: date,
          })),
        }))
      },

      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),

      clearCart: () => set({ items: [], couponCode: null, couponDiscount: 0 }),

      getItemCount: () => {
        const items = get().items
        const itemsArray = Array.isArray(items) ? items : []
        return itemsArray.reduce((sum, i) => sum + i.quantity, 0)
      },

      getSubtotal: () => {
        const items = get().items
        const itemsArray = Array.isArray(items) ? items : []
        return itemsArray.reduce((sum, item) => {
          const unitPrice = Number(item.price)
          const addonTotal = calculateAddonTotal(item.addonSelections || [])
          return sum + (unitPrice + addonTotal) * item.quantity
        }, 0)
      },
    }),
    {
      name: "giftscart-cart",
      skipHydration: true,
      merge: (persistedState: unknown, currentState: CartStore) => ({
        ...currentState,
        ...(persistedState as Partial<CartStore>),
        items: Array.isArray((persistedState as Partial<CartStore>)?.items)
          ? (persistedState as Partial<CartStore>).items!
          : [],
      }),
    }
  )
)
