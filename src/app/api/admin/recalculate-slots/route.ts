import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { recalculateCitySlotCutoff } from '@/lib/recalculate-city-slots'

export async function POST() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cities = await prisma.city.findMany({ where: { isActive: true } })
  for (const city of cities) {
    await recalculateCitySlotCutoff(city.id)
  }

  return NextResponse.json({
    success: true,
    message: `Recalculated slots for ${cities.length} cities`,
  })
}
