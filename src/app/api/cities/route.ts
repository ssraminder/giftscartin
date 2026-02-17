import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        baseDeliveryCharge: true,
        freeDeliveryAbove: true,
      },
    })

    return NextResponse.json({ success: true, data: cities })
  } catch (error) {
    console.error('GET /api/cities error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
