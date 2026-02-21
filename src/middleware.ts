import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Referral cookie forwarding: capture ?ref= param into cookie for persistence
    const ref = req.nextUrl.searchParams.get('ref')
    const existingRef = req.cookies.get('gci_ref')

    if (ref && !existingRef) {
      const sanitized = ref.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50)
      if (sanitized) {
        const response = NextResponse.next()
        response.cookies.set('gci_ref', sanitized, {
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          sameSite: 'lax',
        })
        return response
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Only these paths require authentication
        const protectedPaths = ['/checkout', '/orders', '/vendor', '/admin']
        const isProtected = protectedPaths.some(p => path.startsWith(p))
        // If not a protected path, always allow
        if (!isProtected) return true
        // If protected path, require token
        return !!token
      }
    },
    pages: {
      signIn: '/login'
    }
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|placeholder-product.svg|logo.svg|icons).*)'
  ]
}
