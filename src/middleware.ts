import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const vendorPaths = ['/vendor']
const adminPaths = ['/admin']

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

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

  // Vendor routes: require VENDOR or ADMIN role
  if (isVendorPath) {
    if (role !== 'VENDOR' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Admin routes: require ADMIN or SUPER_ADMIN role
  if (isAdminPath) {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/orders',
    '/orders/:path*',
    '/vendor',
    '/vendor/:path*',
    '/admin',
    '/admin/:path*',
  ],
}
