import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { CityProvider } from "@/components/providers/city-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

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
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <CityProvider>{children}</CityProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
