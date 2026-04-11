import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendOTPEmail(email: string, otp: string) {
  const fromAddress = `noreply@${process.env.RESEND_DOMAIN || "yi.chat"}`;

  const { error } = await getResend().emails.send({
    from: fromAddress,
    to: email,
    subject: `Your verification code: ${otp}`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">Verification Code</h2>
        <p style="color: #666; margin-bottom: 24px;">Enter this code to sign in:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f4f4f5; border-radius: 8px; margin-bottom: 24px;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
