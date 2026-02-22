import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatPrice } from "@/lib/utils"

function formatDeliveryDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getPaymentMethodLabel(method: string | null): string {
  if (!method) return "Online"
  const map: Record<string, string> = {
    upi: "UPI",
    card: "Card",
    netbanking: "Net Banking",
    cod: "Cash on Delivery",
  }
  return map[method.toLowerCase()] || method
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let order
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        address: true,
        items: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
        payment: true,
      },
    })
  } catch {
    redirect("/")
  }

  if (!order) {
    redirect("/")
  }

  const userName = order.senderName || order.user?.name || "friend"
  const firstItemName = order.items[0]?.product?.name || order.items[0]?.name || "a gift"
  const total = Number(order.total)
  const paymentLabel = getPaymentMethodLabel(order.paymentMethod)
  const deliveryDateFormatted = formatDeliveryDate(order.deliveryDate)

  // WhatsApp share message
  const whatsappMessage = encodeURIComponent(
    `I just placed an order for ${firstItemName} from Gifts Cart India! Order #${order.orderNumber}. Track it at giftscart.netlify.app/orders/${id}`
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Confetti + Checkmark Animation */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0); }
          60% { transform: scale(1.15); }
          80% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes confettiSpread {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-scale-in {
          animation: scaleIn 0.6s ease-out forwards;
        }
        .animate-fade-up {
          animation: fadeUp 0.5s ease-out 0.4s both;
        }
        .confetti-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: confettiSpread 0.8s ease-out 0.3s both;
        }
      `}</style>

      {/* Success Circle with Confetti */}
      <div className="relative flex items-center justify-center">
        {/* Confetti dots */}
        <span className="confetti-dot bg-pink-400" style={{ top: "-4px", left: "calc(50% - 48px)", animationDuration: "0.9s" }} />
        <span className="confetti-dot bg-yellow-400" style={{ top: "8px", right: "calc(50% - 52px)", animationDuration: "0.7s" }} />
        <span className="confetti-dot bg-blue-400" style={{ bottom: "8px", left: "calc(50% - 44px)", animationDuration: "1s" }} />
        <span className="confetti-dot bg-green-400" style={{ top: "20px", left: "calc(50% + 40px)", animationDuration: "0.8s" }} />
        <span className="confetti-dot bg-purple-400" style={{ bottom: "4px", right: "calc(50% - 40px)", animationDuration: "0.85s" }} />
        <span className="confetti-dot bg-orange-400" style={{ top: "-8px", right: "calc(50% - 28px)", animationDuration: "0.75s" }} />

        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
          <span className="text-5xl text-white font-bold">✓</span>
        </div>
      </div>

      {/* Heading */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-center mt-6">
          Order Placed Successfully! 🎉
        </h1>
        <p className="text-gray-600 text-center mt-1">
          Thank you, {userName}!
        </p>
      </div>

      {/* Order Number Card */}
      <div className="bg-gray-50 rounded-xl p-4 text-center mt-6 border animate-fade-up">
        <p className="text-sm text-gray-500">Your Order Number</p>
        <p className="text-2xl font-mono font-bold text-pink-600 mt-1">
          #{order.orderNumber}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Save this for tracking your order
        </p>
      </div>

      {/* Delivery Details Card */}
      <div className="rounded-xl border p-4 mt-4 animate-fade-up">
        <h2 className="font-semibold mb-3">Delivery Details</h2>
        <div className="space-y-3">
          {/* Date & Slot */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">📅 Delivering on</span>
            <span className="text-right text-gray-900">
              {deliveryDateFormatted}
              {order.deliverySlot && (
                <span className="text-gray-500"> · {order.deliverySlot}</span>
              )}
            </span>
          </div>

          {/* Address */}
          {order.address && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 shrink-0">📍 Delivering to</span>
              <span className="text-right text-gray-900 ml-2">
                {order.address.name}, {order.address.address}, {order.address.city} - {order.address.pincode}
              </span>
            </div>
          )}

          {/* Total Paid */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">💰 Total Paid</span>
            <span className="text-gray-900">
              {formatPrice(total)}
              <span className="text-gray-500"> · {paymentLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* WhatsApp Share Button */}
      <a
        href={`https://wa.me/?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full mt-6 py-3 rounded-xl border-2 border-green-500 text-green-600 font-semibold hover:bg-green-50 transition-colors"
      >
        📲 Share on WhatsApp
      </a>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/orders/${id}`}
          className="flex items-center justify-center w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold transition-colors"
        >
          Track Your Order →
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
