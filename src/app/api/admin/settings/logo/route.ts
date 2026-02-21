import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isAdminRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { getSupabase } from '@/lib/supabase'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function GET() {
  try {
    const settings = await prisma.platformSetting.findMany()
    const result: Record<string, string | null> = {}
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

      const supabase = getSupabase()
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        return NextResponse.json(
          { success: false, error: 'Failed to upload file' },
          { status: 500 }
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from('products')
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

    // Upsert into platform_settings
    await prisma.platformSetting.upsert({
      where: { key: 'logo_url' },
      update: { value: logoUrl, updatedBy: session.user.id },
      create: { key: 'logo_url', value: logoUrl, updatedBy: session.user.id },
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
