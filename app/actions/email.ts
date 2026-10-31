"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTicketUpdateEmail(
  toEmail: string,
  customerName: string,
  ticketId: string,
  newStatus: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: toEmail,
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

    if (error) {
      console.error("Resend API Error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Failed to send email:", err);
    return { success: false, error: err.message };
  }
}