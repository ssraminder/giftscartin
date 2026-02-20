import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { ADMIN_ROLES, VENDOR_ROLES } from '@/lib/roles'

const publicRoutes = ['/login', '/register', '/', '/api/auth']
const vendorPaths = ['/vendor']
const adminPaths = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Never redirect public routes — prevents redirect loops on login/register
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request })

  const isVendorPath =
    vendorPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAdminPath =
    adminPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // Not logged in — redirect to login with callback
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string | undefined

  // Vendor routes: require VENDOR/VENDOR_STAFF or any admin role
  if (isVendorPath) {
    if (!role || (!(VENDOR_ROLES as readonly string[]).includes(role) && !(ADMIN_ROLES as readonly string[]).includes(role))) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Admin routes: require any admin role
  if (isAdminPath) {
    if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/checkout',
    '/checkout/:path*',
    '/orders',
    '/orders/:path*',
    '/vendor',
    '/vendor/:path*',
    '/admin',
    '/admin/:path*',
  ],
}
