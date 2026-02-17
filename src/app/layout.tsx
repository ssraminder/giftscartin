import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { CityProvider } from "@/components/providers/city-provider"
import { CartHydration } from "@/components/providers/cart-provider"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

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
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <SessionProvider>
          <CityProvider>
            <CartHydration />
            {children}
          </CityProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
