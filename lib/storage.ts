import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "ticket-attachments";

/**
 * Uploads a customer or agent attachment securely into the private ticket bucket.
 */
export async function uploadTicketAttachment(ticketId: string, file: File) {
  const supabase = createClient();
  
  // Sanitize and create a unique file path partitioned by ticket ID
  const fileExt = file.name.split(".").pop();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${Date.now()}_${sanitizedName}`;
  const filePath = `${ticketId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Secure storage upload failed: ${error.message}`);
  }

  return { path: data.path, fileName: file.name };
}

/**
 * Generates a time-bound signed URL (valid for 60 minutes) for secure agent review.
 */
export async function getSecureAttachmentUrl(filePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // 1-hour expiration for PDPL compliance

  if (error) {
    throw new Error(`Failed to generate secure viewing link: ${error.message}`);
  }

  return data.signedUrl;
}