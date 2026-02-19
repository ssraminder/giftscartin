'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { JsonLd } from './json-ld'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://giftscart.netlify.app'

interface BreadcrumbItem {
  label: string
  href?: string
}

function buildBreadcrumbJsonLd(crumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const schema = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    ...items.map((item) => ({
      name: item.label,
      url: item.href ? `${SITE_URL}${item.href}` : SITE_URL,
    })),
  ])

  return (
    <>
      <JsonLd data={schema} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-500 py-3">
        <Link href="/" className="hover:text-pink-600 transition-colors">Home</Link>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-pink-600 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-800 font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
