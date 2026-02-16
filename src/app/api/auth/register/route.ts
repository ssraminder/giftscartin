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

    const { phone, name, email } = parsed.data

    // Ensure OTP was verified for this phone
    const verifiedOtp = await prisma.otpVerification.findFirst({
      where: {
        phone,
        verified: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verifiedOtp) {
      return NextResponse.json(
        { success: false, error: 'Phone number not verified. Please verify OTP first.' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this phone number already exists' },
        { status: 409 }
      )
    }

    // Check email uniqueness if provided
    if (email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      })

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email address already in use' },
          { status: 409 }
        )
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        phone,
        name,
        email: email || null,
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
