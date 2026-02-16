import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'

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

    // Ensure OTP was verified for this email
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: {
        email,
        verified: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verifiedOtp) {
      return NextResponse.json(
        { success: false, error: 'Email not verified. Please verify OTP first.' },
        { status: 403 }
      )
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Check phone uniqueness if provided
    if (phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone },
      })

      if (phoneExists) {
        return NextResponse.json(
          { success: false, error: 'Phone number already in use' },
          { status: 409 }
        )
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone: phone || '',
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { user, message: 'Registration successful' },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
