import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { PartnerProvider } from "@/components/providers/partner-provider"
import { CityProvider } from "@/components/providers/city-provider"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { CartHydration } from "@/components/providers/cart-provider"

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>
          <CurrencyProvider>
            <PartnerProvider>
              <CityProvider>
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
