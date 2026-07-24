const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, otp) => {
  // 1. Try Gmail SMTP first
  try {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `BloodLoss Monitor <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>BloodLoss Monitor OTP</h2>
        <h1>${otp}</h1>
      </div>
    `,
  });

  console.log("✅ GMAIL SMTP EMAIL SENT");
  console.log(info.response);
  return true;

} catch (gmailError) {
    console.error("❌ GMAIL SMTP FAILED, trying Resend SMTP...", gmailError.message);

    // 2. Try Resend SMTP as a fallback if configured
    if (process.env.RESEND_SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.resend.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.RESEND_SMTP_USER || "resend",
            pass: process.env.RESEND_SMTP_PASS,
          },
        });

        const info = await transporter.sendMail({
          from: "BloodLoss Monitor <onboarding@resend.dev>",
          to: to,
          subject: subject,
          html: `
            <div style="font-family:Arial;padding:20px">
              <h2>BloodLoss Monitor OTP</h2>
              <h1>${otp}</h1>
            </div>
          `,
        });

        console.log("✅ RESEND SMTP EMAIL SENT");
        console.log(info.response);
        return true;
      } catch (resendError) {
        console.error("❌ RESEND SMTP ALSO FAILED:", resendError.message);
      }
    }

    console.log("-----------------------------------------");
    console.log(`⚠️  FALLBACK: Your OTP is: ${otp}`);
    console.log("-----------------------------------------");
    // Return true anyway so the frontend doesn't crash, allowing the user to type the OTP from the terminal
    return true;
  }
};

module.exports = sendEmail;