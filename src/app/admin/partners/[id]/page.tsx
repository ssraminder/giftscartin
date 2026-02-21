import { prisma } from '@/lib/prisma'
import { PartnerForm } from '@/components/admin/partner-form'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditPartnerPage({
  params,
}: {
  params: { id: string }
}) {
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
  })

  if (!partner) notFound()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Edit Partner &mdash; {partner.name}
      </h1>
      <PartnerForm
        partnerId={partner.id}
        initialData={{
          name: partner.name,
          refCode: partner.refCode,
          commissionPercent: String(Number(partner.commissionPercent)),
          defaultCityId: partner.defaultCityId || '',
          defaultVendorId: partner.defaultVendorId || '',
          logoUrl: partner.logoUrl || '',
          primaryColor: partner.primaryColor,
          showPoweredBy: partner.showPoweredBy,
          isActive: partner.isActive,
        }}
      />
    </div>
  )
}
