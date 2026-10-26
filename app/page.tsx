"use client";

import { useState } from "react";
import { submitTicket } from "./actions"; // Now `./actions` works because `app/page.tsx` and `app/actions.ts` are in the same folder!

export default function CustomerForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage("");

    try {
      const result = await submitTicket({ name, description });

      if (result.success) {
        setSuccessMessage("Ticket submitted successfully!");
        setName("");
        setDescription("");
      } else {
        setError(result.error || "Failed to submit ticket.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-xl shadow-lg mt-10">
      <h2 className="text-2xl font-bold mb-2">How can we help?</h2>
      <p className="text-sm text-slate-400 mb-6">
        Tell us what went wrong and we'll open a ticket for our support team.
      </p>

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Omar Al-Hassan"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">What's the issue?</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, what you expected, and any steps to reproduce."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Sending ticket..." : "Send ticket"}
        </button>
      </form>
    </div>
  );
}