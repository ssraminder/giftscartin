import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'
import { uploadSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = uploadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { fileName, fileType, folder } = parsed.data

    // Generate a unique file path
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${folder}/${session.user.id}/${timestamp}-${sanitizedName}`

    // Create a signed upload URL using Supabase Storage
    const { data, error } = await getSupabase().storage
      .from('giftscart')
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error('Supabase storage error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to generate upload URL' },
        { status: 500 }
      )
    }

    // Build the public URL for after upload
    const { data: publicUrlData } = getSupabase().storage
      .from('giftscart')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
        fileType,
      },
    })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
