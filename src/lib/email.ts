// Email service for password reset and email verification
// TODO: Replace with actual email service (SendGrid, Resend, AWS SES, etc.)

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}`;

  // TODO: Replace with actual email service
  // For now, log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("=".repeat(60));
    console.log("📧 PASSWORD RESET EMAIL");
    console.log("=".repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your ClaimPilot Password`);
    console.log(`\nClick the link below to reset your password:\n${resetUrl}\n`);
    console.log("This link will expire in 24 hours.");
    console.log("=".repeat(60));
  }

  // In production, integrate with email service:
  // await emailService.send({
  //   to: email,
  //   subject: "Reset Your ClaimPilot Password",
  //   html: generatePasswordResetEmail(resetUrl),
  // });
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${BASE_URL}/auth/verify-email?token=${token}`;

  // TODO: Replace with actual email service
  // For now, log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("=".repeat(60));
    console.log("📧 EMAIL VERIFICATION");
    console.log("=".repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: Verify Your ClaimPilot Email`);
    console.log(`\nClick the link below to verify your email:\n${verifyUrl}\n`);
    console.log("This link will expire in 24 hours.");
    console.log("=".repeat(60));
  }

  // In production, integrate with email service:
  // await emailService.send({
  //   to: email,
  //   subject: "Verify Your ClaimPilot Email",
  //   html: generateVerificationEmail(verifyUrl),
  // });
}

function generatePasswordResetEmail(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">ClaimPilot</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="margin-top: 0;">Reset Your Password</h2>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;
}

function generateVerificationEmail(verifyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">ClaimPilot</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="margin-top: 0;">Verify Your Email</h2>
          <p>Welcome to ClaimPilot! Please verify your email address by clicking the button below:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
          <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
        </div>
      </body>
    </html>
  `;
}

