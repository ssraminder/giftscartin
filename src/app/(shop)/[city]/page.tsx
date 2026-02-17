"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, ArrowRight, Gift, Truck, Clock, Shield } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { CategoryGrid } from "@/components/home/category-grid"
import { TrendingProducts } from "@/components/home/trending-products"
import type { ApiResponse } from "@/types"

interface CityData {
  id: string
  name: string
  slug: string
  state: string
  baseDeliveryCharge: number
  freeDeliveryAbove: number
}

export default function CityPage() {
  const params = useParams()
  const router = useRouter()
  const citySlug = params.city as string

  const [city, setCity] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchCity() {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch("/api/cities")
        const json: ApiResponse<CityData[]> = await res.json()
        if (json.success && json.data) {
          const found = json.data.find((c) => c.slug === citySlug)
          if (found) {
            setCity(found)
          } else {
            setNotFound(true)
          }
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchCity()
  }, [citySlug])

  // Redirect to homepage if city not found
  useEffect(() => {
    if (!loading && notFound) {
      router.replace("/")
    }
  }, [loading, notFound, router])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-[#1A1A2E] via-[#2D1B3D] to-[#1A1A2E]">
          <div className="container mx-auto px-4 py-14 md:py-20">
            <Skeleton className="h-6 w-48 mb-4 bg-white/10" />
            <Skeleton className="h-12 w-96 mb-4 bg-white/10" />
            <Skeleton className="h-5 w-64 bg-white/10" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-64 mx-auto mb-8" />
          <div className="flex justify-center gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!city) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen">
      {/* City Hero Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A2E] via-[#2D1B3D] to-[#1A1A2E]" />
        <div className="absolute inset-0">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        <div className="container relative mx-auto px-4 py-14 md:py-20 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-pink-300 backdrop-blur-sm border border-white/10">
              <MapPin className="h-4 w-4" />
              Delivering in {city.name}, {city.state}
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl tracking-tight">
              Online Gift Delivery in{" "}
              <span className="bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">
                {city.name}
              </span>
            </h1>

            <p className="mt-5 text-lg text-gray-300 sm:text-xl leading-relaxed max-w-lg">
              Fresh Cakes, Flowers &amp; Gifts delivered same-day across {city.name}. Free delivery on orders above &#8377;{Number(city.freeDeliveryAbove)}.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/category/cakes"
                className="btn-gradient px-8 h-12 text-base rounded-xl shadow-lg inline-flex items-center justify-center gap-2"
              >
                <Gift className="h-5 w-5" />
                Order Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/category/flowers"
                className="border border-white/20 text-white hover:bg-white/10 h-12 rounded-xl backdrop-blur-sm px-8 inline-flex items-center justify-center text-base"
              >
                Send Flowers
              </Link>
            </div>
          </div>
        </div>

        {/* Delivery Info Bar */}
        <div className="relative border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/20">
                  <Clock className="h-5 w-5 text-pink-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Same Day</p>
                  <p className="text-xs text-gray-400">Order before 4 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                  <Shield className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">100% Fresh</p>
                  <p className="text-xs text-gray-400">Guaranteed quality</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                  <Truck className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Free Delivery</p>
                  <p className="text-xs text-gray-400">Above &#8377;{Number(city.freeDeliveryAbove)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                  <MapPin className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{city.name}</p>
                  <p className="text-xs text-gray-400">{city.state}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <CategoryGrid />

      {/* Trending products */}
      <TrendingProducts />
    </div>
  )
}
