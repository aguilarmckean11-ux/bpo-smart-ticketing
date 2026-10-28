"use client";

import { useState } from "react";
import { uploadTicketAttachment } from "@/lib/storage";

interface FileUploadProps {
  ticketId: string;
  onUploadComplete: (filePath: string) => void;
}

export default function FileUpload({ ticketId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validation: Max 10MB limit for compliance & performance
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit (Compliance & Security policy).");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await uploadTicketAttachment(ticketId, file);
      setSuccessMsg(`Successfully uploaded: ${result.fileName}`);
      onUploadComplete(result.path);
    } catch (err: any) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
        📁 Secure Document Attachment (PDF, PNG, JPG, DOCX — Max 10MB)
      </label>
      <div className="flex items-center gap-3">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          accept=".pdf,.png,.jpg,.jpeg,.docx,.zip"
          className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
        />
      </div>
      {uploading && (
        <p className="text-xs text-indigo-400 animate-pulse">
          🔒 Encrypting & uploading to secure storage bucket...
        </p>
      )}
      {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}
      {successMsg && <p className="text-xs text-emerald-400 font-semibold">{successMsg}</p>}
    </div>
  );
}