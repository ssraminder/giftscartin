const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY!
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID!
const MSG91_BASE_URL = 'https://control.msg91.com/api/v5'

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${MSG91_BASE_URL}/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=91${phone}`, {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.type === 'success') {
      return { success: true, message: 'OTP sent successfully' }
    }

    return { success: false, message: data.message || 'Failed to send OTP' }
  } catch (error) {
    console.error('MSG91 sendOtp error:', error)
    return { success: false, message: 'Failed to send OTP' }
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${MSG91_BASE_URL}/otp/verify?mobile=91${phone}&otp=${otp}`, {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.type === 'success') {
      return { success: true, message: 'OTP verified successfully' }
    }

    return { success: false, message: data.message || 'Invalid OTP' }
  } catch (error) {
    console.error('MSG91 verifyOtp error:', error)
    return { success: false, message: 'Failed to verify OTP' }
  }
}
