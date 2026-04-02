import { Truck, Leaf, ShieldCheck, Gift } from "lucide-react"

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: "Same Day Delivery",
    subtitle: "Order before 4 PM",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    icon: Leaf,
    title: "100% Fresh",
    subtitle: "Guaranteed quality",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    subtitle: "100% safe checkout",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Gift,
    title: "500+ Products",
    subtitle: "For every occasion",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
]

export function TrustStrip() {
  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl py-6 px-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={item.title}
                className={`flex flex-col items-center text-center ${
                  i < TRUST_ITEMS.length - 1 ? "md:border-r md:border-gray-100" : ""
                }`}
              >
                <div className={`${item.bg} rounded-xl p-3 mb-3`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
