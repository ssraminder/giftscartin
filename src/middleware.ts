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
        // Vendor and admin panels always require auth
        if (path.startsWith('/vendor') || path.startsWith('/admin')) {
          return !!token
        }
        // Order history list requires auth, but individual order pages
        // (/orders/[id] and /orders/[id]/confirmation) are accessible
        // to guests — order IDs are UUIDs so they're unguessable
        if (path === '/orders') {
          return !!token
        }
        // All other paths are public
        return true
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
