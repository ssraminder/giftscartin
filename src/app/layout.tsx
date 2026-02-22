import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { PartnerProvider } from "@/components/providers/partner-provider"
import { CityProvider } from "@/components/providers/city-provider"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { CartHydration } from "@/components/providers/cart-provider"
import { GooglePlacesProvider } from "@/components/providers/google-places-provider"

const inter = localFont({
  src: '../../public/fonts/inter-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://giftscart.netlify.app'),
  title: "Gifts Cart India — Send Cakes, Flowers & Gifts Online",
  description:
    "Order fresh cakes, flowers, and gifts for delivery across India. Same-day and midnight delivery available. Gifts Cart India by Cital Enterprises.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Preconnect to Supabase for faster image/API loading */}
        <link rel="preconnect" href="https://saeditdtacprxcnlgips.supabase.co" />
        <link rel="dns-prefetch" href="https://saeditdtacprxcnlgips.supabase.co" />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>
          <CurrencyProvider>
            <PartnerProvider>
              <CityProvider>
                <GooglePlacesProvider />
                <CartHydration />
                {children}
              </CityProvider>
            </PartnerProvider>
          </CurrencyProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
