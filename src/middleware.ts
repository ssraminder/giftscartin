import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'CITY_MANAGER', 'OPERATIONS']
const VENDOR_ROLES = ['VENDOR', 'VENDOR_STAFF']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Referral cookie forwarding: capture ?ref= param into cookie for persistence
  const ref = request.nextUrl.searchParams.get('ref')
  const existingRef = request.cookies.get('gci_ref')

  const response = NextResponse.next()

  if (ref && !existingRef) {
    const sanitized = ref.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50)
    if (sanitized) {
      response.cookies.set('gci_ref', sanitized, {
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
      })
    }
  }

  // Check if route requires authentication
  const isAdminRoute = pathname.startsWith('/admin')
  const isVendorRoute = pathname.startsWith('/vendor')
  const isOrdersListRoute = pathname === '/orders'

  const requiresAuth = isAdminRoute || isVendorRoute || isOrdersListRoute

  if (!requiresAuth) {
    return response
  }

  // Get session from JWT cookie
  const session = await getSessionFromRequest(request)

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  if (isAdminRoute && !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isVendorRoute && !VENDOR_ROLES.includes(session.role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|placeholder-product.svg|logo.svg|icons).*)'
  ]
}
