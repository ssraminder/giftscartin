import { getSupabaseAdmin } from '@/lib/supabase'
import { PartnerForm } from '@/components/admin/partner-form'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditPartnerPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = getSupabaseAdmin()
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', params.id)
    .single()

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
          defaultCityId: partner.default_city_id || '',
          defaultVendorId: partner.default_vendor_id || '',
          logoUrl: partner.logoUrl || '',
          primaryColor: partner.primaryColor,
          showPoweredBy: partner.showPoweredBy,
          isActive: partner.isActive,
        }}
      />
    </div>
  )
}
