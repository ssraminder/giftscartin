import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || !user?.role || !isAdminRole(user.role)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { cityId } = await params
    const body = await request.json()
    const { baseDeliveryCharge, freeDeliveryAbove, slots } = body

    // Update city-level delivery settings if provided
    const cityData: Record<string, unknown> = {}
    if (baseDeliveryCharge !== undefined) cityData.baseDeliveryCharge = baseDeliveryCharge
    if (freeDeliveryAbove !== undefined) cityData.freeDeliveryAbove = freeDeliveryAbove

    if (Object.keys(cityData).length > 0) {
      await prisma.city.update({
        where: { id: cityId },
        data: cityData,
      })
    }

    // Upsert city_delivery_configs for each slot
    if (slots && Array.isArray(slots)) {
      for (const slot of slots) {
        const { slotId, isAvailable, chargeOverride } = slot
        await prisma.cityDeliveryConfig.upsert({
          where: {
            cityId_slotId: { cityId, slotId },
          },
          update: {
            isAvailable,
            chargeOverride: chargeOverride !== undefined && chargeOverride !== null && chargeOverride !== '' ? chargeOverride : null,
          },
          create: {
            cityId,
            slotId,
            isAvailable,
            chargeOverride: chargeOverride !== undefined && chargeOverride !== null && chargeOverride !== '' ? chargeOverride : null,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/admin/delivery/city-config/[cityId] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update city config' }, { status: 500 })
  }
}
