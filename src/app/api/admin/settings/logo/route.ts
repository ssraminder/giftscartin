import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isAdminRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function GET() {
  try {
    const settings = await prisma.platformSetting.findMany({
      select: { key: true, value: true, updatedAt: true },
    })
    // Always return safe defaults for expected keys
    const result: Record<string, string | null> = {
      logo_url: null,
      site_name: null,
      favicon_url: null,
    }
    for (const s of settings) {
      result[s.key] = s.value
    }
    return NextResponse.json({ success: true, data: result }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('GET /api/admin/settings/logo error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const contentType = request.headers.get('content-type') || ''

    let logoUrl: string

    if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid file type. Accepted: PNG, JPG, SVG` },
          { status: 400 }
        )
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'File too large. Maximum size: 2MB' },
          { status: 400 }
        )
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const timestamp = Date.now()
      const filePath = `branding/logo-${timestamp}.${ext}`

      // Use service role key for storage uploads (falls back to anon key)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const buffer = Buffer.from(await file.arrayBuffer())

      // Try platform-assets bucket first, then fall back to products bucket
      let uploadBucket = 'platform-assets'
      let uploadError = null

      const { error: primaryError } = await supabase.storage
        .from('platform-assets')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        })

      if (primaryError) {
        console.warn('platform-assets bucket upload failed, trying products bucket:', primaryError.message)
        uploadBucket = 'products'
        const { error: fallbackError } = await supabase.storage
          .from('products')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true,
          })
        uploadError = fallbackError
      }

      if (uploadError) {
        console.error('Supabase upload error (both buckets failed):', uploadError)
        return NextResponse.json(
          { success: false, error: 'File upload failed. Use JSON body with { "logoUrl": "https://..." } instead.' },
          { status: 500 }
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from(uploadBucket)
        .getPublicUrl(filePath)

      logoUrl = publicUrlData.publicUrl
    } else {
      // JSON body with URL
      const body = await request.json()
      const url = body.logoUrl as string

      if (!url || typeof url !== 'string') {
        return NextResponse.json(
          { success: false, error: 'logoUrl is required' },
          { status: 400 }
        )
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return NextResponse.json(
          { success: false, error: 'logoUrl must start with http:// or https://' },
          { status: 400 }
        )
      }

      if (url.length > 500) {
        return NextResponse.json(
          { success: false, error: 'logoUrl must be 500 characters or less' },
          { status: 400 }
        )
      }

      logoUrl = url
    }

    // Upsert into platform_settings (updatedAt is auto-set by @updatedAt)
    await prisma.platformSetting.upsert({
      where: { key: 'logo_url' },
      update: { value: logoUrl, updatedBy: session.user.id, updatedAt: new Date() },
      create: { key: 'logo_url', value: logoUrl, updatedBy: session.user.id, updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: { logoUrl },
    })
  } catch (error) {
    console.error('POST /api/admin/settings/logo error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update logo' },
      { status: 500 }
    )
  }
}
