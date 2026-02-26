import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get("cityId")
    const productIdsParam = searchParams.get("productIds")

    if (!cityId || !productIdsParam) {
      return NextResponse.json(
        { success: false, error: "cityId and productIds are required" },
        { status: 400 }
      )
    }

    const productIds = productIdsParam.split(",").filter(Boolean)
    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one productId is required" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Check city_slot_cutoff for express slot availability
    const { data: cutoffRow, error: cutoffError } = await supabase
      .from("city_slot_cutoff")
      .select("is_available, base_charge, cutoff_hours")
      .eq("city_id", cityId)
      .eq("slot_slug", "express")
      .maybeSingle()

    if (cutoffError) {
      console.error("[express-eligibility] cutoff query error:", cutoffError)
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          expressCharge: 0,
          cutoffHours: 0,
          reason: "not_available_in_city" as const,
        },
      })
    }

    if (!cutoffRow || !cutoffRow.is_available) {
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          expressCharge: 0,
          cutoffHours: 0,
          reason: "not_available_in_city" as const,
        },
      })
    }

    const expressCharge = Number(cutoffRow.base_charge) || 200
    const cutoffHours = Number(cutoffRow.cutoff_hours) || 3

    // 2. Check all products have isExpressEligible = true
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, \"isExpressEligible\"")
      .in("id", productIds)

    if (productsError) {
      console.error("[express-eligibility] products query error:", productsError)
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          expressCharge: 0,
          cutoffHours,
          reason: "products_not_eligible" as const,
        },
      })
    }

    // All products must exist and have isExpressEligible = true
    const allEligible =
      products &&
      products.length === productIds.length &&
      products.every((p) => p.isExpressEligible === true)

    if (!allEligible) {
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          expressCharge: 0,
          cutoffHours,
          reason: "products_not_eligible" as const,
        },
      })
    }

    // 3. Check current IST time: eligible only if current hour < (24 - cutoffHours)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const currentHour = nowIST.getUTCHours()

    if (currentHour >= 24 - cutoffHours) {
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          expressCharge,
          cutoffHours,
          reason: "too_late" as const,
        },
      })
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      data: {
        eligible: true,
        expressCharge,
        cutoffHours,
      },
    })
  } catch (error) {
    console.error("[express-eligibility] unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
