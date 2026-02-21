export function TrustStrip() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gray-50 rounded-2xl py-4 px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0">
            <div className="flex flex-col items-center text-center md:border-r md:border-gray-200">
              <span className="text-2xl leading-none" role="img" aria-label="delivery">
                🚚
              </span>
              <p className="mt-2 text-sm font-semibold text-gray-800">Same Day Delivery</p>
              <p className="text-xs text-gray-500">Order before 4 PM</p>
            </div>
            <div className="flex flex-col items-center text-center md:border-r md:border-gray-200">
              <span className="text-2xl leading-none" role="img" aria-label="fresh">
                🌿
              </span>
              <p className="mt-2 text-sm font-semibold text-gray-800">100% Fresh</p>
              <p className="text-xs text-gray-500">Guaranteed quality</p>
            </div>
            <div className="flex flex-col items-center text-center md:border-r md:border-gray-200">
              <span className="text-2xl leading-none" role="img" aria-label="secure">
                🔒
              </span>
              <p className="mt-2 text-sm font-semibold text-gray-800">Secure Payments</p>
              <p className="text-xs text-gray-500">100% safe checkout</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-2xl leading-none" role="img" aria-label="products">
                🎁
              </span>
              <p className="mt-2 text-sm font-semibold text-gray-800">500+ Products</p>
              <p className="text-xs text-gray-500">For every occasion</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
