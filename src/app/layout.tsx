import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { CityProvider } from "@/components/providers/city-provider"

export const metadata: Metadata = {
  title: "GiftIndia - Send Cakes, Flowers & Gifts Online",
  description:
    "Order fresh cakes, flowers, and gifts for delivery across India. Same-day and midnight delivery available.",
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
          <CityProvider>{children}</CityProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
