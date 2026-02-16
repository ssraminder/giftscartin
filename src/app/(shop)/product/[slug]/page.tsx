"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Minus, Plus, ShoppingCart, Star, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ProductGallery } from "@/components/product/product-gallery"
import { DeliverySlotPicker } from "@/components/product/delivery-slot-picker"
import { AddonSelector } from "@/components/product/addon-selector"
import { ReviewList } from "@/components/product/review-list"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/hooks/use-cart"
import type { Product, ProductAddon, Review, AddonSelection } from "@/types"

// ── Placeholder data ──────────────────────────────────────────────

const SAMPLE_ADDONS: ProductAddon[] = [
  { id: "a1", productId: "p1", name: "Chocolate Box", price: 299, image: "/placeholder-product.svg", isActive: true },
  { id: "a2", productId: "p1", name: "Greeting Card", price: 49, image: "/placeholder-product.svg", isActive: true },
  { id: "a3", productId: "p1", name: "Teddy Bear", price: 399, image: "/placeholder-product.svg", isActive: true },
  { id: "a4", productId: "p1", name: "Candle Set", price: 149, image: "/placeholder-product.svg", isActive: true },
  { id: "a5", productId: "p1", name: "Balloon Bunch", price: 199, image: "/placeholder-product.svg", isActive: true },
  { id: "a6", productId: "p1", name: "Rose Bouquet", price: 499, image: "/placeholder-product.svg", isActive: true },
]

const SAMPLE_REVIEWS: Review[] = [
  { id: "r1", userId: "u1", productId: "p1", orderId: "o1", rating: 5, comment: "Absolutely delicious! The cake was fresh and the delivery was on time. Loved it!", images: [], isVerified: true, createdAt: "2026-01-15T10:00:00Z", user: { id: "u1", name: "Priya S." } },
  { id: "r2", userId: "u2", productId: "p1", orderId: "o2", rating: 4, comment: "Good cake, nicely decorated. Slightly smaller than expected but taste was great.", images: [], isVerified: true, createdAt: "2026-01-10T14:30:00Z", user: { id: "u2", name: "Rahul M." } },
  { id: "r3", userId: "u3", productId: "p1", orderId: "o3", rating: 5, comment: "Ordered for my wife's birthday. She loved it! Will order again.", images: [], isVerified: true, createdAt: "2025-12-28T09:15:00Z", user: { id: "u3", name: "Amit K." } },
  { id: "r4", userId: "u4", productId: "p1", orderId: null, rating: 3, comment: "Decent cake. Packaging could be better.", images: [], isVerified: false, createdAt: "2025-12-20T16:45:00Z", user: { id: "u4", name: "Sneha R." } },
  { id: "r5", userId: "u5", productId: "p1", orderId: "o5", rating: 5, comment: "Best cake in Chandigarh! Perfect for celebrations.", images: [], isVerified: true, createdAt: "2025-12-15T11:00:00Z", user: { id: "u5", name: "Deepak T." } },
]

const ALL_PRODUCTS: Record<string, Product & { categorySlug: string; categoryName: string }> = {
  "chocolate-truffle-cake": {
    id: "p1", name: "Chocolate Truffle Cake", slug: "chocolate-truffle-cake",
    description: "Indulge in the rich, velvety goodness of our Chocolate Truffle Cake. Made with premium Belgian chocolate and layered with smooth chocolate ganache, this cake is a true celebration of chocolate. Perfect for birthdays, anniversaries, or any occasion that calls for something special. Each cake is freshly baked by our expert bakers and delivered with care.",
    shortDesc: "Rich & decadent", categoryId: "cat-cakes", basePrice: 599,
    images: ["/placeholder-product.svg", "/placeholder-product.svg", "/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.5, totalReviews: 128, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "red-velvet-cake": {
    id: "p2", name: "Red Velvet Cake", slug: "red-velvet-cake",
    description: "Our signature Red Velvet Cake features moist, vibrant red layers with a luscious cream cheese frosting. A perfect blend of subtle cocoa and tangy buttermilk, topped with white chocolate shavings. This classic favorite is ideal for Valentine's Day, birthdays, and any celebration.",
    shortDesc: "Classic favorite", categoryId: "cat-cakes", basePrice: 699,
    images: ["/placeholder-product.svg", "/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "valentines-day"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.7, totalReviews: 95, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "black-forest-cake": {
    id: "p3", name: "Black Forest Cake", slug: "black-forest-cake",
    description: "A timeless classic that never goes out of style. Layers of chocolate sponge, whipped cream, and cherries come together in this indulgent Black Forest Cake. Topped with chocolate shavings and maraschino cherries for the perfect finish.",
    shortDesc: "Timeless classic", categoryId: "cat-cakes", basePrice: 549,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 72, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "butterscotch-cake": {
    id: "p4", name: "Butterscotch Cake", slug: "butterscotch-cake",
    description: "Smooth, creamy butterscotch cake topped with caramel crunch and praline decorations. A sweet delight that melts in your mouth. Perfect for those who love a rich caramel flavor.",
    shortDesc: "Sweet & crunchy", categoryId: "cat-cakes", basePrice: 499,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.2, totalReviews: 56, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "photo-cake": {
    id: "p5", name: "Photo Cake", slug: "photo-cake",
    description: "Make your celebration extra personal with our customizable Photo Cake. Upload your favorite photo and we'll print it on a delicious vanilla or chocolate cake using food-grade edible ink. Available in multiple sizes.",
    shortDesc: "Personalized", categoryId: "cat-cakes", basePrice: 899,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "1kg", isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 43, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "red-roses-bouquet": {
    id: "p9", name: "Red Roses Bouquet", slug: "red-roses-bouquet",
    description: "Express your love with our stunning bouquet of 12 premium red roses, elegantly wrapped in craft paper and finished with a satin ribbon. Each rose is hand-picked for freshness and size to create the perfect romantic gesture.",
    shortDesc: "Romantic & elegant", categoryId: "cat-flowers", basePrice: 699,
    images: ["/placeholder-product.svg", "/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["valentines-day", "anniversary"], weight: null, isVeg: true, isActive: true, avgRating: 4.8, totalReviews: 210, createdAt: "", updatedAt: "",
    categorySlug: "flowers", categoryName: "Flowers",
  },
  "mixed-flower-arrangement": {
    id: "p10", name: "Mixed Flower Arrangement", slug: "mixed-flower-arrangement",
    description: "A vibrant arrangement of seasonal mixed flowers including roses, carnations, lilies, and greens. Arranged in an elegant basket, this colorful bouquet is perfect for brightening someone's day.",
    shortDesc: "Colorful & bright", categoryId: "cat-flowers", basePrice: 899,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 67, createdAt: "", updatedAt: "",
    categorySlug: "flowers", categoryName: "Flowers",
  },
  "orchid-bunch": {
    id: "p11", name: "Orchid Bunch", slug: "orchid-bunch",
    description: "Premium orchid bunch featuring beautiful purple orchids in elegant packaging. A luxurious choice for special occasions and discerning recipients who appreciate the finer things in life.",
    shortDesc: "Premium blooms", categoryId: "cat-flowers", basePrice: 1299,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["anniversary", "thank-you"], weight: null, isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 28, createdAt: "", updatedAt: "",
    categorySlug: "flowers", categoryName: "Flowers",
  },
  "cake-flowers-combo": {
    id: "p14", name: "Cake & Flowers Combo", slug: "cake-flowers-combo",
    description: "The perfect combination — a delicious chocolate truffle cake paired with a beautiful bouquet of red roses. Send love and sweetness together. Ideal for birthdays, anniversaries, and Valentine's Day.",
    shortDesc: "Perfect pair", categoryId: "cat-combos", basePrice: 1199,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary", "valentines-day"], weight: "500g + bouquet", isVeg: true, isActive: true, avgRating: 4.9, totalReviews: 156, createdAt: "", updatedAt: "",
    categorySlug: "combos", categoryName: "Combos",
  },
  "money-plant": {
    id: "p19", name: "Money Plant", slug: "money-plant",
    description: "The golden Money Plant is considered a symbol of good luck and prosperity. This low-maintenance plant comes in a beautiful ceramic pot, making it an ideal gift for housewarmings, new beginnings, or simply to add a touch of green to any space.",
    shortDesc: "Lucky charm", categoryId: "cat-plants", basePrice: 399,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["housewarming", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.1, totalReviews: 34, createdAt: "", updatedAt: "",
    categorySlug: "plants", categoryName: "Plants",
  },
  "chocolate-gift-box": {
    id: "p24", name: "Chocolate Gift Box", slug: "chocolate-gift-box",
    description: "A premium collection of assorted chocolates beautifully presented in an elegant gift box. Includes dark, milk, and white chocolate varieties with flavors like hazelnut, caramel, and orange. Perfect for any chocolate lover.",
    shortDesc: "Choco heaven", categoryId: "cat-gifts", basePrice: 799,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "thank-you"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 48, createdAt: "", updatedAt: "",
    categorySlug: "gifts", categoryName: "Gifts",
  },
}

// ── Component ─────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const productData = ALL_PRODUCTS[slug]
  const addItem = useCart((s) => s.addItem)

  const [quantity, setQuantity] = useState(1)
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([])
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null)
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null)

  if (!productData) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find the product you&apos;re looking for.
        </p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Go back to home
        </Link>
      </div>
    )
  }

  const { categorySlug, categoryName, ...product } = productData

  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const totalPrice = (product.basePrice + addonTotal) * quantity

  const handleAddToCart = () => {
    addItem(product, quantity, selectedAddons)
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/category/${categorySlug}`} className="hover:text-primary transition-colors">
          {categoryName}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
      </nav>

      {/* Main content: gallery + details */}
      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        {/* Left — Gallery */}
        <ProductGallery images={product.images} name={product.name} />

        {/* Right — Product info */}
        <div className="space-y-5">
          {/* Name and badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {product.isVeg && <Badge variant="success" className="text-[10px] px-1.5 py-0">VEG</Badge>}
              {product.tags.includes("bestseller") && <Badge variant="accent" className="text-[10px] px-1.5 py-0">Bestseller</Badge>}
            </div>
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">{product.name}</h1>
            {product.weight && (
              <p className="text-sm text-muted-foreground mt-0.5">{product.weight}</p>
            )}
          </div>

          {/* Rating */}
          {product.totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded bg-green-600 px-2 py-0.5">
                <Star className="h-3 w-3 fill-white text-white" />
                <span className="text-xs font-semibold text-white">{product.avgRating.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.totalReviews} {product.totalReviews === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}

          {/* Price */}
          <div>
            <span className="text-2xl font-bold text-foreground">{formatPrice(product.basePrice)}</span>
            <p className="text-xs text-muted-foreground mt-0.5">Inclusive of all taxes</p>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          {/* Occasion tags */}
          {product.occasion.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.occasion.map((occ) => (
                <Badge key={occ} variant="outline" className="text-[10px] capitalize">
                  {occ.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
          )}

          <Separator />

          {/* Delivery info */}
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-primary" />
            <span>Delivery available in Chandigarh, Mohali &amp; Panchkula</span>
          </div>

          <Separator />

          {/* Delivery slot picker */}
          <DeliverySlotPicker
            selectedDate={deliveryDate}
            selectedSlot={deliverySlot}
            onDateChange={setDeliveryDate}
            onSlotChange={setDeliverySlot}
          />

          <Separator />

          {/* Add-ons */}
          <AddonSelector
            addons={SAMPLE_ADDONS}
            selected={selectedAddons}
            onChange={setSelectedAddons}
          />

          {selectedAddons.length > 0 && <Separator />}

          {/* Quantity + Add to cart */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center gap-2 rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Price summary if addons or qty > 1 */}
            {(selectedAddons.length > 0 || quantity > 1) && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {product.name} x {quantity}
                  </span>
                  <span>{formatPrice(product.basePrice * quantity)}</span>
                </div>
                {selectedAddons.map((addon) => (
                  <div key={addon.addonId} className="flex justify-between">
                    <span className="text-muted-foreground">{addon.name} x {quantity}</span>
                    <span>{formatPrice(addon.price * quantity)}</span>
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full gap-2 text-base"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
              Add to Cart — {formatPrice(totalPrice)}
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-10 sm:mt-14">
        <h2 className="text-xl font-bold sm:text-2xl mb-4">Customer Reviews</h2>
        <ReviewList
          reviews={SAMPLE_REVIEWS}
          avgRating={product.avgRating}
          totalReviews={product.totalReviews}
        />
      </div>
    </div>
  )
}
