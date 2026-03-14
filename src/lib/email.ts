import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.dev>";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your TaskFlow password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #111;">Reset your password</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">
          You requested a password reset for your TaskFlow account.
        </p>
        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
