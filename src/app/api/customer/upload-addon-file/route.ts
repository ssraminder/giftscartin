import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB server-side max

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const addonGroupId = formData.get('addonGroupId') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!addonGroupId) {
      return NextResponse.json(
        { success: false, error: 'addonGroupId is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Accepted: ${ALLOWED_TYPES.map((t) => t.split('/')[1]).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      )
    }

    // Get session ID (or generate a random one for guests)
    const session = await getServerSession(authOptions)
    const sessionId = session?.user?.id || `guest-${crypto.randomUUID().slice(0, 12)}`

    // Sanitize filename
    const sanitizedFilename = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')

    const timestamp = Date.now()
    const filePath = `pending/${sessionId}/${addonGroupId}/${timestamp}-${sanitizedFilename}`

    // Upload to Supabase Storage
    const supabase = getSupabase()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('order-uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedData, error: signError } = await supabase.storage
      .from('order-uploads')
      .createSignedUrl(filePath, 3600)

    if (signError || !signedData?.signedUrl) {
      console.error('Signed URL error:', signError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate file URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: signedData.signedUrl,
        fileName: file.name,
        filePath,
      },
    })
  } catch (error) {
    console.error('POST /api/customer/upload-addon-file error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
