import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://giftscart.netlify.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/vendor/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
