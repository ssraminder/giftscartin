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
  product: Product
}

interface CartStore {
  items: CartItemState[]
  couponCode: string | null
  couponDiscount: number
  addItem: (product: Product, quantity?: number, legacyAddons?: { addonId: string; name: string; price: number }[], legacyVariation?: { variationId: string; type: string; label: string; price: number } | null) => void
  addItemAdvanced: (params: {
    product: Product
    quantity: number
    price: number
    variationId: string | null
    selectedAttributes: Record<string, string> | null
    addonSelections: AddonSelectionRecord[]
  }) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateDelivery: (itemId: string, date: string | null, slot: string | null) => void
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

        set((state) => {
          const currentItems = Array.isArray(state.items) ? state.items : []
          // For legacy calls, match by productId (simple dedup)
          const existing = currentItems.find((i) => i.productId === normalizedProduct.id)
          if (existing) {
            return {
              items: currentItems.map((i) =>
                i.id === existing.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          return {
            items: [
              ...currentItems,
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
                product: normalizedProduct,
              },
            ],
          }
        })
      },

      // New addItemAdvanced for Phase D with full variation + addon group support
      addItemAdvanced: ({ product, quantity, price, variationId, selectedAttributes, addonSelections }) => {
        const normalizedProduct = { ...product, basePrice: Number(product.basePrice) }

        set((state) => {
          const currentItems = Array.isArray(state.items) ? state.items : []
          return {
            items: [
              ...currentItems,
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
                deliveryDate: null,
                deliverySlot: null,
                product: normalizedProduct,
              },
            ],
          }
        })
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

      updateDelivery: (itemId, date, slot) => {
        set((state) => ({
          items: (Array.isArray(state.items) ? state.items : []).map((i) =>
            i.id === itemId
              ? { ...i, deliveryDate: date, deliverySlot: slot }
              : i
          ),
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
