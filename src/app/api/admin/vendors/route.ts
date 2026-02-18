import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user ||
      !['ADMIN', 'SUPER_ADMIN'].includes(
        (session.user as { role?: string }).role || ''
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        city: { select: { name: true, slug: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: vendors.map((v) => ({
        ...v,
        commissionRate: Number(v.commissionRate),
        rating: Number(v.rating),
      })),
    })
  } catch (error) {
    console.error('Admin vendors GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}
