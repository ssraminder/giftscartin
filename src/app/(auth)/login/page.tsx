'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, Mail, ArrowLeft, Loader2 } from 'lucide-react'

const RESEND_COOLDOWN = 30

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const sendOtp = useCallback(async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to send OTP')
        return false
      }

      setResendTimer(RESEND_COOLDOWN)
      return true
    } catch {
      setError('Something went wrong. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [email])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    const sent = await sendOtp()
    if (sent) {
      setStep('otp')
    }
  }

  async function handleResendOtp() {
    await sendOtp()
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        otp,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid OTP. Please try again.')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show nothing while checking auth status
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100">
            {step === 'email' ? (
              <Gift className="h-7 w-7 text-pink-600" />
            ) : (
              <Mail className="h-7 w-7 text-pink-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'email' ? 'Welcome to GiftIndia' : 'Enter OTP'}
          </CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Sign in with your email to continue'
              : `We sent a 6-digit code to ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  disabled={loading}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('email')
                    setOtp('')
                    setError('')
                  }}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Change email
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                >
                  {resendTimer > 0
                    ? `Resend in ${resendTimer}s`
                    : 'Resend OTP'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            New here?{' '}
            <Link
              href={`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="font-medium text-pink-600 hover:text-pink-700"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
