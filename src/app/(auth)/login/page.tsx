'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Gift, Loader2, ArrowLeft, Sparkles, Heart, Package } from 'lucide-react'

const RESEND_COOLDOWN = 30

type Step = 'email' | 'otp'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Hydration guard — wait for client mount before rendering interactive UI
  useEffect(() => {
    setMounted(true)
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  // Redirect if already logged in
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const isCheckoutFlow = callbackUrl.includes('/checkout') && !callbackUrl.includes('/orders')
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl)
    }
  }, [status, router, callbackUrl])

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    }
  }, [step])

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

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle individual OTP digit input
  function handleOtpDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const digit = value.slice(-1)
    const newOtp = otp.split('')
    // Pad array to 6 characters
    while (newOtp.length < 6) newOtp.push('')
    newOtp[index] = digit
    const joined = newOtp.join('')
    setOtp(joined.replace(/\s/g, ''))

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newOtp = otp.split('')
      while (newOtp.length < 6) newOtp.push('')

      if (newOtp[index]) {
        // Clear current digit
        newOtp[index] = ''
        setOtp(newOtp.join(''))
      } else if (index > 0) {
        // Move back and clear previous digit
        newOtp[index - 1] = ''
        setOtp(newOtp.join(''))
        otpInputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      setOtp(pasted)
      const focusIndex = Math.min(pasted.length, 5)
      otpInputRefs.current[focusIndex]?.focus()
    }
  }

  // Show nothing until client is mounted (prevents mobile hydration mismatch)
  // or while checking auth status
  if (!mounted || status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex items-center justify-center" style={{ backgroundColor: '#FFF9F5', minHeight: '100dvh' }}>
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    )
  }

  return (
    <div className="flex" style={{ backgroundColor: '#FFF9F5', minHeight: '100dvh' }}>
      {/* Left Panel - Hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col items-center justify-center px-12"
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #2D1B3D 50%, #1A1A2E 100%)',
        }}
      >
        {/* Decorative pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-16 opacity-20">
          <Heart className="h-16 w-16 text-pink-400" fill="currentColor" />
        </div>
        <div className="absolute bottom-32 right-20 opacity-15">
          <Sparkles className="h-20 w-20 text-purple-400" />
        </div>
        <div className="absolute top-1/3 right-16 opacity-10">
          <Package className="h-14 w-14 text-pink-300" />
        </div>
        <div className="absolute bottom-20 left-24 opacity-10">
          <Gift className="h-12 w-12 text-purple-300" />
        </div>

        {/* Gradient orbs */}
        <div
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #E91E63 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #9C27B0 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-lg">
          {/* Logo on left panel */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #E91E63, #FF6B9D)' }}
            >
              <Gift className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-pink-400">Gifts</span>
              <span className="text-white">Cart India</span>
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Make Every Moment
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #FF6B9D, #E91E63, #FF9800)' }}
            >
              Unforgettable
            </span>
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed mb-10">
            Fresh cakes, beautiful flowers, and thoughtful gifts delivered right to their doorstep. Celebrate love, joy, and togetherness.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Same Day Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-400" />
              <span>100% Fresh Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span>500+ Cities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Logo for mobile / form header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #E91E63, #FF6B9D)' }}
              >
                <Gift className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold">
                <span style={{ color: '#E91E63' }}>Gifts</span>
                <span style={{ color: '#1A1A2E' }}>Cart India</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#1A1A2E' }}>
              {step === 'email' ? 'Welcome Back' : 'Verify Your Email'}
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#757575' }}>
              {step === 'email'
                ? 'Sign in to send love and happiness'
                : (
                  <>
                    We sent a 6-digit code to{' '}
                    <span className="font-medium" style={{ color: '#1A1A2E' }}>{email}</span>
                  </>
                )}
            </p>
          </div>

          {/* Form Card */}
          <div className="card-premium p-6 sm:p-8">
            {/* Transition wrapper */}
            <div
              className="transition-all duration-300 ease-in-out"
              style={{
                opacity: 1,
              }}
            >
              {step === 'email' ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium"
                      style={{ color: '#1A1A2E' }}
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-lg text-base transition-all duration-200 outline-none disabled:opacity-50"
                      style={{
                        backgroundColor: '#FFF9F5',
                        border: '1.5px solid #E8DDD5',
                        color: '#1A1A2E',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#E91E63'
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233, 30, 99, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E8DDD5'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {error && (
                    <div
                      className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                      style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="btn-gradient w-full py-3 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {/* OTP digit boxes */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-3"
                      style={{ color: '#1A1A2E' }}
                    >
                      Enter 6-digit OTP
                    </label>
                    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={otp[i] || ''}
                          onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          disabled={loading}
                          className="w-full aspect-square max-w-[52px] text-center text-xl font-semibold rounded-lg transition-all duration-200 outline-none disabled:opacity-50"
                          style={{
                            backgroundColor: otp[i] ? '#FFF0F5' : '#FFF9F5',
                            border: otp[i] ? '2px solid #E91E63' : '1.5px solid #E8DDD5',
                            color: '#1A1A2E',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#E91E63'
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233, 30, 99, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = otp[i] ? '#E91E63' : '#E8DDD5'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                          aria-label={`OTP digit ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div
                      className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                      style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="btn-gradient w-full py-3 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Login'
                    )}
                  </button>

                  {/* Back + Resend row */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email')
                        setOtp('')
                        setError('')
                      }}
                      className="flex items-center gap-1 text-sm font-medium transition-colors duration-200"
                      style={{ color: '#757575' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#E91E63' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#757575' }}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change email
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || loading}
                      className="text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                      style={{ color: resendTimer > 0 ? '#9CA3AF' : '#E91E63' }}
                    >
                      {resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Register link */}
          <p className="text-center mt-6 text-sm" style={{ color: '#757575' }}>
            New here?{' '}
            <Link
              href={`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="font-semibold transition-colors duration-200"
              style={{ color: '#E91E63' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#C2185B' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#E91E63' }}
            >
              Create an account
            </Link>
          </p>

          {/* Guest checkout option */}
          {isCheckoutFlow && (
            <div className="mt-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">or</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/checkout')}
                className="mt-4 w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
              >
                Continue as Guest
              </button>
              <p className="mt-2 text-xs text-gray-400">
                No account needed — just enter your details at checkout
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center" style={{ backgroundColor: '#FFF9F5', minHeight: '100dvh' }}>
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
