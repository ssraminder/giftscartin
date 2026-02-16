const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@giftindia.com'
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'GiftIndia'

function getOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAFAFA;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#E91E63,#9C27B0);padding:32px 24px;text-align:center;">
              <h1 style="color:#FFFFFF;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">GiftIndia</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Your gifting destination</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;text-align:center;">
              <p style="color:#212121;font-size:16px;margin:0 0 8px;font-weight:600;">Your Login OTP</p>
              <p style="color:#757575;font-size:14px;margin:0 0 24px;">Use the code below to verify your email address</p>
              <div style="background-color:#FFF0F5;border:2px dashed #E91E63;border-radius:12px;padding:20px;margin:0 auto;max-width:240px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#E91E63;">${otp}</span>
              </div>
              <p style="color:#757575;font-size:13px;margin:24px 0 0;">This OTP expires in <strong>10 minutes</strong></p>
              <p style="color:#9E9E9E;font-size:12px;margin:16px 0 0;">If you didn't request this, please ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F5F5;padding:16px 24px;text-align:center;border-top:1px solid #EEEEEE;">
              <p style="color:#9E9E9E;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} GiftIndia. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  // In development, log OTP to console and skip sending
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${email}: ${otp}`)
    return { success: true, message: 'OTP logged to console (dev mode)' }
  }

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY not set, cannot send OTP email')
    return { success: false, message: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email }],
        subject: 'Your GiftIndia Login OTP',
        htmlContent: getOtpEmailHtml(otp),
      }),
    })

    if (response.ok) {
      return { success: true, message: 'OTP email sent successfully' }
    }

    const errorData = await response.text()
    console.error('Brevo API error:', response.status, errorData)
    return { success: false, message: 'Failed to send OTP email' }
  } catch (error) {
    console.error('Brevo sendOtpEmail error:', error)
    return { success: false, message: 'Failed to send OTP email' }
  }
}
