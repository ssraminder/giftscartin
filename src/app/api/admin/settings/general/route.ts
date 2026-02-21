import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isAdminRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { siteName, faviconUrl } = body as {
      siteName?: string
      faviconUrl?: string
    }

    if (siteName !== undefined) {
      if (typeof siteName !== 'string' || siteName.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'siteName must be a non-empty string' },
          { status: 400 }
        )
      }
      if (siteName.length > 100) {
        return NextResponse.json(
          { success: false, error: 'siteName must be 100 characters or less' },
          { status: 400 }
        )
      }
      await prisma.platformSetting.upsert({
        where: { key: 'site_name' },
        update: { value: siteName.trim(), updatedBy: session.user.id },
        create: { key: 'site_name', value: siteName.trim(), updatedBy: session.user.id },
      })
    }

    if (faviconUrl !== undefined) {
      if (faviconUrl !== null && typeof faviconUrl === 'string' && faviconUrl.length > 0) {
        if (!faviconUrl.startsWith('http://') && !faviconUrl.startsWith('https://')) {
          return NextResponse.json(
            { success: false, error: 'faviconUrl must start with http:// or https://' },
            { status: 400 }
          )
        }
        if (faviconUrl.length > 500) {
          return NextResponse.json(
            { success: false, error: 'faviconUrl must be 500 characters or less' },
            { status: 400 }
          )
        }
      }
      await prisma.platformSetting.upsert({
        where: { key: 'favicon_url' },
        update: { value: faviconUrl || null, updatedBy: session.user.id },
        create: { key: 'favicon_url', value: faviconUrl || null, updatedBy: session.user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/admin/settings/general error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
