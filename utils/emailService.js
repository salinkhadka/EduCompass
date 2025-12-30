const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send welcome email
const sendWelcomeEmail = async (email, username) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to EduCompass!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a3a52; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to EduCompass!</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Welcome to EduCompass! We're excited to have you join our community.</p>
            <p>Start exploring universities and scholarships that match your goals.</p>
            <p>Best regards,<br>The EduCompass Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    throw new Error('Failed to send welcome email');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, resetToken) => {
  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request - EduCompass',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a3a52; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #d4af37; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for your EduCompass account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <p>Best regards,<br>The EduCompass Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
};

// Send password change confirmation email
const sendPasswordChangeEmail = async (email, username) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Changed Successfully - EduCompass',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a3a52; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Your password has been changed successfully.</p>
            <p>If you did not make this change, please contact support immediately.</p>
            <p>Best regards,<br>The EduCompass Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Password change email error:', error);
    throw new Error('Failed to send password change email');
  }
};

module.exports = { 
  sendPasswordResetEmail, 
  sendWelcomeEmail,
  sendPasswordChangeEmail 
};