import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOtpSchema } from '@/lib/validations'

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

    // Find the most recent unexpired, unverified OTP for this email
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

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
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    })

    // Verify OTP
    if (otpRecord.otp !== otp) {
      const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1
      return NextResponse.json(
        { success: false, error: `Invalid OTP. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    })

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'OTP verified successfully',
        isNewUser: !existingUser,
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
