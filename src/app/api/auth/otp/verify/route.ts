import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { signToken, createSessionCookie, type SessionUser } from '@/lib/auth'
import { verifyOtpSchema } from '@/lib/validations'

export const runtime = 'edge'

const MAX_ATTEMPTS = 5

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email, otp } = parsed.data
    const supabase = getSupabaseAdmin()

    // Find the most recent unexpired, unverified OTP for this email
    const { data: otpRecord } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .gt('expiresAt', new Date().toISOString())
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please request a new OTP.' },
        { status: 429 }
      )
    }

    // Increment attempt count
    await supabase
      .from('otp_verifications')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id)

    // Verify OTP
    if (otpRecord.otp !== otp) {
      const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1
      return NextResponse.json(
        { success: false, error: `Invalid OTP. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    // Find existing user by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name, role, phone')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      // Existing user: sign JWT and set session cookie
      const sessionUser: SessionUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        phone: existingUser.phone,
      }

      const token = await signToken(sessionUser)
      const cookie = createSessionCookie(token)

      const response = NextResponse.json({
        success: true,
        data: {
          message: 'OTP verified successfully',
          isNewUser: false,
          email,
          user: sessionUser,
        },
      })

      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge,
        path: cookie.path,
      })

      return response
    }

    // New user: return isNewUser flag so client can redirect to registration
    return NextResponse.json({
      success: true,
      data: {
        message: 'OTP verified successfully',
        isNewUser: true,
        email,
      },
    })
  } catch (error) {
    console.error('OTP verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
