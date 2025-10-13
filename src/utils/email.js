// src/utils/email.js
import nodemailer from "nodemailer";

// This function sets up our email transporter.
// For development, it uses Ethereal. For production, you'd use a real service.
async function createTransporter() {
  if (process.env.NODE_ENV === "production") {
    // --- PRODUCTION EMAIL SETUP (e.g., using Gmail, SendGrid, etc.) ---
    // You would replace this with your actual email provider's settings.
    // Example for Gmail (requires "less secure app access" to be enabled):
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your-email@gmail.com
        pass: process.env.EMAIL_PASS, // your-gmail-app-password
      },
    });
  } else {
    // --- DEVELOPMENT EMAIL SETUP (using Ethereal) ---
    // Create a test account on Ethereal
    let testAccount = await nodemailer.createTestAccount();
    console.log("Ethereal test account created:");
    console.log(`User: ${testAccount.user}`);
    console.log(`Pass: ${testAccount.pass}`);

    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }
}

// This is the main function we'll call from our controllers.
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await createTransporter();

    const info = await transporter.sendMail({
      from: '"MyPlatform Notifications" <noreply@myplatform.com>', // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: text, // plain text body
      html: html, // html body
    });

    console.log("Message sent: %s", info.messageId);

    // If in development, log the preview URL from Ethereal
    if (process.env.NODE_ENV !== "production") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Error sending email:", error);
    // We don't throw here, just log it. Email failure shouldn't crash the app.
  }
};
