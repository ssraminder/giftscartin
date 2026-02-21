import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPartnersPage() {
  const partners = await prisma.partner.findMany({
    include: {
      defaultCity: { select: { name: true } },
      defaultVendor: { select: { businessName: true } },
      _count: { select: { orders: true, earnings: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Partners</h1>
        <Link
          href="/admin/partners/new"
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm font-medium"
        >
          + New Partner
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ref Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Default City</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Default Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Commission</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Orders</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      ?ref={p.refCode}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {p.defaultCity?.name || <span className="text-gray-300">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {p.defaultVendor?.businessName || <span className="text-gray-300">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3">{Number(p.commissionPercent)}%</td>
                  <td className="px-4 py-3">{p._count.orders}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/partners/${p.id}`}
                      className="text-pink-500 hover:text-pink-600 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {partners.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No partners yet. Create your first partner.
          </div>
        )}
      </div>
    </div>
  )
}
