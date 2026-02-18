"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AddonSelection, Product, VariationSelection } from "@/types"

export interface CartItemState {
  productId: string
  quantity: number
  addons: AddonSelection[]
  variation: VariationSelection | null
  deliveryDate: string | null
  deliverySlot: string | null
  product: Product
}

interface CartStore {
  items: CartItemState[]
  couponCode: string | null
  couponDiscount: number
  addItem: (product: Product, quantity?: number, addons?: AddonSelection[], variation?: VariationSelection | null) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateAddons: (productId: string, addons: AddonSelection[]) => void
  updateVariation: (productId: string, variation: VariationSelection | null) => void
  updateDelivery: (productId: string, date: string | null, slot: string | null) => void
  setCoupon: (code: string | null, discount: number) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,

      addItem: (product, quantity = 1, addons = [], variation = null) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: i.quantity + quantity, variation: variation ?? i.variation }
                  : i
              ),
            }
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                quantity,
                addons,
                variation,
                deliveryDate: null,
                deliverySlot: null,
                product,
              },
            ],
          }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }))
      },

      updateAddons: (productId, addons) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, addons } : i
          ),
        }))
      },

      updateVariation: (productId, variation) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, variation } : i
          ),
        }))
      },

      updateDelivery: (productId, date, slot) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, deliveryDate: date, deliverySlot: slot }
              : i
          ),
        }))
      },

      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),

      clearCart: () => set({ items: [], couponCode: null, couponDiscount: 0 }),

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const unitPrice = item.variation ? item.variation.price : item.product.basePrice
          const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0)
          return sum + (unitPrice + addonTotal) * item.quantity
        }, 0)
      },
    }),
    {
      name: "giftscart-cart",
      skipHydration: true,
    }
  )
)
