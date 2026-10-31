"use server";

import nodemailer from "nodemailer";

export async function sendTicketUpdateEmail(
  toEmail: string,
  customerName: string,
  ticketId: string,
  newStatus: string
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // TLS via STARTTLS on port 587
      auth: {
        user: process.env.SMTP_USER || "waldo82@ethereal.email",
        pass: process.env.SMTP_PASS || "WYxxByr5xDWQFxMwSt",
      },
    });

    const info = await transporter.sendMail({
      from: '"BPO Support Operations" <support@bpo-middleeast.com>',
      to: toEmail || "waldo82@ethereal.email",
      subject: `[Ticket Update] Status changed to ${newStatus.toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <h2 style="color: #818cf8;">BPO Support Ticket Update</h2>
          <p>Hello <strong>${customerName}</strong>,</p>
          <p>Your ticket (ID: <code>${ticketId}</code>) status has been updated to: <strong style="color: #34d399;">${newStatus.replace('_', ' ').toUpperCase()}</strong>.</p>
          <hr style="border-color: #334155;" />
          <p style="font-size: 12px; color: #94a3b8;">Middle East Support Operations - Automated System</p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log("----------------------------------------");
    console.log("✉️ Ethereal Email Sent!");
    console.log("🔗 Preview Email Link:", previewUrl);
    console.log("----------------------------------------");

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err: any) {
    console.error("Failed to send email:", err);
    return { success: false, error: err.message };
  }
}