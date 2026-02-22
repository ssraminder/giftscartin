import { prisma } from './prisma'

export async function recalculateCitySlotCutoff(
  cityId: string
): Promise<void> {
  const [slots, vendors] = await Promise.all([
    prisma.deliverySlot.findMany({ where: { isActive: true } }),
    prisma.vendor.findMany({
      where: { cityId, status: 'APPROVED' },
      include: { slots: true },
    }),
  ])

  await Promise.all(
    slots.map(async (slot) => {
      const activeVendorCount = vendors.filter((vendor) => {
        const vendorSlot = vendor.slots.find((vs) => vs.slotId === slot.id)
        return vendorSlot?.isEnabled === true
      }).length

      const cutoffHours = getCutoffHours(slot.slug)

      await prisma.citySlotCutoff.upsert({
        where: { cityId_slotId: { cityId, slotId: slot.id } },
        update: {
          minVendors:  activeVendorCount,
          isAvailable: activeVendorCount > 0,
          slotName:    slot.name,
          slotSlug:    slot.slug,
          slotStart:   slot.startTime,
          slotEnd:     slot.endTime,
          cutoffHours,
          baseCharge:  slot.baseCharge,
          updatedAt:   new Date(),
        },
        create: {
          cityId,
          slotId:      slot.id,
          slotName:    slot.name,
          slotSlug:    slot.slug,
          slotStart:   slot.startTime,
          slotEnd:     slot.endTime,
          cutoffHours,
          baseCharge:  slot.baseCharge,
          minVendors:  activeVendorCount,
          isAvailable: activeVendorCount > 0,
        },
      })
    })
  )
}

function getCutoffHours(slug: string): number {
  const map: Record<string, number> = {
    midnight:        6,
    'early-morning': 12,
    express:         2,
    'fixed-slot':    4,
    standard:        4,
  }
  return map[slug] ?? 4
}
