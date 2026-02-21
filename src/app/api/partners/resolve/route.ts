import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Hostnames that belong to the platform — never treated as partner domains
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

    const whereConditions: Record<string, string>[] = []

    if (ref) {
      whereConditions.push({ refCode: ref })
    }

    if (domain && !INTERNAL_HOSTS.some(h => domain === h || domain.endsWith(`.${h}`))) {
      const isSubdomain =
        domain.endsWith('.giftscart.in') ||
        domain.endsWith('.giftscart.netlify.app')

      if (isSubdomain) {
        // "sweetdelights.giftscart.in" → "sweetdelights"
        const sub = domain.split('.')[0]
        whereConditions.push({ subdomain: sub })
      } else {
        whereConditions.push({ customDomain: domain })
      }
    }

    if (whereConditions.length === 0) {
      return NextResponse.json({ success: true, data: null })
    }

    const partner = await prisma.partner.findFirst({
      where: { OR: whereConditions, isActive: true },
      select: {
        id: true,
        name: true,
        refCode: true,
        logoUrl: true,
        primaryColor: true,
        showPoweredBy: true,
        commissionPercent: true,
        defaultCityId: true,
        defaultVendorId: true,
        defaultCity: {
          select: { id: true, name: true, slug: true },
        },
        defaultVendor: {
          select: { id: true, businessName: true, status: true, isOnline: true },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ success: true, data: null })
    }

    const vendorValid =
      partner.defaultVendor?.status === 'APPROVED' &&
      partner.defaultVendor?.isOnline

    const responseData = {
      id: partner.id,
      name: partner.name,
      refCode: partner.refCode,
      logoUrl: partner.logoUrl,
      primaryColor: partner.primaryColor || '#E91E63',
      showPoweredBy: partner.showPoweredBy,
      commissionPercent: Number(partner.commissionPercent),
      defaultCityId: partner.defaultCity?.id || null,
      defaultCitySlug: partner.defaultCity?.slug || null,
      defaultCityName: partner.defaultCity?.name || null,
      defaultVendorId: vendorValid ? partner.defaultVendorId : null,
      defaultVendorName: vendorValid ? partner.defaultVendor?.businessName : null,
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
