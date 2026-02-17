"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Gift,
  ShieldCheck,
  Truck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HeroBanner() {
  const [pincode, setPincode] = useState("")

  return (
    <section className="relative overflow-hidden">
      {/* Background with warm gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A2E] via-[#2D1B3D] to-[#1A1A2E]" />

      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-pink-400/8 blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="container relative mx-auto px-4 py-14 md:py-20 lg:py-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-pink-300 backdrop-blur-sm border border-white/10">
            <Gift className="h-4 w-4" />
            Now delivering in Chandigarh, Mohali & Panchkula
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl lg:text-7xl tracking-tight">
            Make Every{" "}
            <span className="bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">
              Moment
            </span>{" "}
            Special
          </h1>

          <p className="mt-5 text-lg text-gray-300 sm:text-xl leading-relaxed max-w-lg">
            Fresh Cakes, Flowers & Gifts — Delivered Today to your loved ones
          </p>

          {/* Pincode Input */}
          <div className="mt-8 flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter Delivery Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                className="h-12 pl-4 pr-4 rounded-xl bg-white/95 border-0 text-gray-800 placeholder:text-gray-400 text-base shadow-lg"
              />
            </div>
            <Button className="h-12 px-6 rounded-xl btn-gradient text-base shadow-lg">
              Check
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Delivering to 3 cities
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Same Day Available
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="btn-gradient px-8 h-12 text-base rounded-xl shadow-lg"
              asChild
            >
              <Link href="/category/cakes">
                Order Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white h-12 rounded-xl backdrop-blur-sm"
              asChild
            >
              <Link href="/category/flowers">
                Send Flowers
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Trust Badges Row */}
      <div className="relative border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/20">
                <Clock className="h-5 w-5 text-pink-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Same Day Delivery</p>
                <p className="text-xs text-gray-400">Order before 4 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">100% Fresh</p>
                <p className="text-xs text-gray-400">Guaranteed quality</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                <ShieldCheck className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Safe Payments</p>
                <p className="text-xs text-gray-400">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                <Truck className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">500+ Products</p>
                <p className="text-xs text-gray-400">Wide selection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
