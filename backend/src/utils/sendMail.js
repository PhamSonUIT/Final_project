import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const otpCache = new Map();

export const sendOTPEmail = async (email, fullName, actionName) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5p
  otpCache.set(email, { otp, expiresAt });

  const mailOptions = {
    from: `"Hệ thống Smart Parking" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[Smart Parking] Mã xác thực ${actionName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
        <h2 style="color: #2c3e50;">Xin chào ${fullName},</h2>
        <p>Bạn đã yêu cầu thực hiện: <strong>${actionName}</strong> trên hệ thống Quản lý bãi đỗ xe thông minh.</p>
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #e74c3c; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #7f8c8d; font-size: 13px;">Mã OTP này có hiệu lực trong vòng 5 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return true;
};

export const verifyOTP = (email, userOtp) => {
  const cached = otpCache.get(email);
  if (!cached) return false;
  if (Date.now() > cached.expiresAt) {
    otpCache.delete(email);
    return false;
  }
  if (cached.otp !== userOtp) return false;
  otpCache.delete(email); 
  return true;
};