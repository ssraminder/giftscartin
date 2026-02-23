import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Hostnames that belong to the platform -- never treated as partner domains
const INTERNAL_HOSTS = [
  'giftscart.netlify.app',
  'giftscart.in',
  'www.giftscart.in',
  'localhost',
  '127.0.0.1',
]

export async function GET(request: NextRequest) {
  try {
    const ref    = request.nextUrl.searchParams.get('ref')
    const domain = request.nextUrl.searchParams.get('domain')

    const supabase = getSupabaseAdmin()

    // Build filter conditions
    let query = supabase
      .from('partners')
      .select('id, name, refCode, logoUrl, primaryColor, showPoweredBy, commissionPercent, default_city_id, default_vendor_id')
      .eq('isActive', true)

    const orConditions: string[] = []

    if (ref) {
      orConditions.push(`refCode.eq.${ref}`)
    }

    if (domain && !INTERNAL_HOSTS.some(h => domain === h || domain.endsWith(`.${h}`))) {
      const isSubdomain =
        domain.endsWith('.giftscart.in') ||
        domain.endsWith('.giftscart.netlify.app')

      if (isSubdomain) {
        // "sweetdelights.giftscart.in" -> "sweetdelights"
        const sub = domain.split('.')[0]
        orConditions.push(`subdomain.eq.${sub}`)
      } else {
        orConditions.push(`customDomain.eq.${domain}`)
      }
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ success: true, data: null })
    }

    if (orConditions.length === 1) {
      // Split the condition manually
      const [field, value] = orConditions[0].split('.eq.')
      query = query.eq(field, value)
    } else {
      query = query.or(orConditions.join(','))
    }

    const { data: partner } = await query.limit(1).maybeSingle()

    if (!partner) {
      return NextResponse.json({ success: true, data: null })
    }

    // Fetch related city and vendor
    let defaultCity: { id: string; name: string; slug: string } | null = null
    if (partner.default_city_id) {
      const { data: city } = await supabase
        .from('cities')
        .select('id, name, slug')
        .eq('id', partner.default_city_id)
        .single()
      defaultCity = city
    }

    let defaultVendor: { id: string; businessName: string; status: string; isOnline: boolean } | null = null
    if (partner.default_vendor_id) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, businessName, status, isOnline')
        .eq('id', partner.default_vendor_id)
        .single()
      defaultVendor = vendor
    }

    const vendorValid =
      defaultVendor?.status === 'APPROVED' &&
      defaultVendor?.isOnline

    const responseData = {
      id: partner.id,
      name: partner.name,
      refCode: partner.refCode,
      logoUrl: partner.logoUrl,
      primaryColor: partner.primaryColor || '#E91E63',
      showPoweredBy: partner.showPoweredBy,
      commissionPercent: Number(partner.commissionPercent),
      defaultCityId: defaultCity?.id || null,
      defaultCitySlug: defaultCity?.slug || null,
      defaultCityName: defaultCity?.name || null,
      defaultVendorId: vendorValid ? partner.default_vendor_id : null,
      defaultVendorName: vendorValid ? defaultVendor?.businessName : null,
    }

    return NextResponse.json(
      { success: true, data: responseData },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    console.error('[partner resolve]', err)
    return NextResponse.json({ success: true, data: null })
  }
}
