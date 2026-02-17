import Link from "next/link"
import {
  Facebook,
  Gift,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Twitter,
  Youtube,
} from "lucide-react"

const QUICK_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/refund", label: "Refund Policy" },
]

const CATEGORIES = [
  { href: "/category/cakes", label: "Cakes" },
  { href: "/category/flowers", label: "Flowers" },
  { href: "/category/combos", label: "Combos" },
  { href: "/category/plants", label: "Plants" },
  { href: "/category/gifts", label: "Gifts" },
]

const CUSTOMER_LINKS = [
  { href: "/orders", label: "Track Order" },
  { href: "/login", label: "My Account" },
  { href: "/cart", label: "Cart" },
]

const SOCIAL_LINKS = [
  { href: "#", label: "Facebook", icon: Facebook },
  { href: "#", label: "Instagram", icon: Instagram },
  { href: "#", label: "Twitter", icon: Twitter },
  { href: "#", label: "YouTube", icon: Youtube },
]

export function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-gray-300 pb-20 md:pb-0">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand & Contact */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-pink-400">Gift</span>
                <span className="text-xl font-bold text-white">India</span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              Fresh cakes, flowers & gifts delivered across India. Making
              every celebration special with love and care.
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <MapPin className="h-4 w-4 shrink-0 text-pink-400" />
                <span>Chandigarh, India</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <Phone className="h-4 w-4 shrink-0 text-pink-400" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <Mail className="h-4 w-4 shrink-0 text-pink-400" />
                <span>support@giftindia.in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-pink-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Categories
            </h3>
            <ul className="mt-4 space-y-3">
              {CATEGORIES.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-pink-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Customer Service
            </h3>
            <ul className="mt-4 space-y-3">
              {CUSTOMER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-pink-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Payment Security Badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/10">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs font-semibold text-white">100% Secure</p>
                <p className="text-[10px] text-gray-500">Payments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Icons Row */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            {/* Payment Methods */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 mr-2">We Accept:</span>
              <div className="flex items-center gap-2">
                {["Visa", "MC", "UPI", "RZP"].map((method) => (
                  <div
                    key={method}
                    className="flex h-8 items-center justify-center rounded bg-white/10 px-3 text-[10px] font-semibold text-gray-300 border border-white/5"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    aria-label={link.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-all duration-200 hover:bg-pink-500 hover:text-white hover:scale-110"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} GiftIndia. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/terms" className="hover:text-pink-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-pink-400 transition-colors">Privacy</Link>
            <Link href="/refund" className="hover:text-pink-400 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
