import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get('cityId')

  if (!cityId) {
    return NextResponse.json(
      { success: false, error: 'cityId required' },
      { status: 400 }
    )
  }

  const cutoffs = await prisma.citySlotCutoff.findMany({
    where: { cityId, isAvailable: true },
    orderBy: { slotStart: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: {
      cityId,
      slots: cutoffs.map((c) => ({
        slotId:      c.slotId,
        name:        c.slotName,
        slug:        c.slotSlug,
        startTime:   c.slotStart,
        endTime:     c.slotEnd,
        cutoffHours: c.cutoffHours,
        baseCharge:  Number(c.baseCharge),
      })),
      updatedAt: cutoffs[0]?.updatedAt ?? null,
    },
  })
}
