import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/brevo'
import { sendOtpSchema } from '@/lib/validations'

const OTP_EXPIRY_MINUTES = 10
const OTP_COOLDOWN_SECONDS = 60

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = sendOtpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // Rate limit: check if an OTP was sent recently for this email
    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        email,
        createdAt: { gt: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentOtp) {
      return NextResponse.json(
        { success: false, error: 'Please wait before requesting another OTP' },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // Store OTP in database
    await prisma.otpVerification.create({
      data: {
        email,
        otp,
        expiresAt,
      },
    })

    // Send OTP via Brevo email
    const result = await sendOtpEmail(email, otp)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: 'OTP sent successfully', expiresInMinutes: OTP_EXPIRY_MINUTES },
    })
  } catch (error) {
    console.error('OTP send error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
