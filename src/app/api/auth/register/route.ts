import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { signToken, createSessionCookie, type SessionUser } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email, name, phone } = parsed.data
    const supabase = getSupabaseAdmin()

    // Ensure OTP was verified for this email
    const { data: verifiedOtp } = await supabase
      .from('otp_verifications')
      .select('id')
      .eq('email', email)
      .eq('verified', true)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!verifiedOtp) {
      return NextResponse.json(
        { success: false, error: 'Email not verified. Please verify OTP first.' },
        { status: 403 }
      )
    }

    // Check if user already exists by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Check phone uniqueness if provided
    if (phone) {
      const { data: phoneUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()

      if (phoneUser) {
        return NextResponse.json(
          { success: false, error: 'Phone number already in use' },
          { status: 409 }
        )
      }
    }

    // Create user
    const now = new Date().toISOString()
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        phone: phone || '',
        role: 'CUSTOMER',
        isActive: true,
        updatedAt: now,
      })
      .select('id, email, name, role, phone, createdAt')
      .single()

    if (createError || !newUser) {
      console.error('Failed to create user:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Sign JWT and set session cookie
    const sessionUser: SessionUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
    }

    const token = await signToken(sessionUser)
    const cookie = createSessionCookie(token)

    const response = NextResponse.json({
      success: true,
      data: { user: sessionUser, message: 'Registration successful' },
    })

    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      path: cookie.path,
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
