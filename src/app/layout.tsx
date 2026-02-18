import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { CityProvider } from "@/components/providers/city-provider"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { CartHydration } from "@/components/providers/cart-provider"

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
      <body className="font-sans antialiased">
        <SessionProvider>
          <CurrencyProvider>
            <CityProvider>
              <CartHydration />
              {children}
            </CityProvider>
          </CurrencyProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
