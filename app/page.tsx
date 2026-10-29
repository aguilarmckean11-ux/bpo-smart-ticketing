"use client";

import { useState } from "react";
import { submitTicket } from "./actions";
import UserAIAssistant from "@/components/UserAIAssistant";

export default function CustomerForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // New states for Tier-0 AI Deflection
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<{ name: string; description: string; priority: string } | null>(null);

  // Simulate Tier-0 AI Knowledge Base check
  const checkAiDeflection = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("password") || lower.includes("login") || lower.includes("sign in")) {
      return "💡 AI Deflection Tip: You can instantly reset your password by clicking 'Forgot Password' on the login screen or clearing your browser cookies.";
    }
    if (lower.includes("api") || lower.includes("503") || lower.includes("timeout")) {
      return "💡 AI Deflection Tip: Regional API gateways in Dubai/Riyadh are fully operational. Please check your bearer token headers or network proxy.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage("");
    setAiSuggestion(null);

    // 1. Run Tier-0 AI Check before creating a ticket
    const suggestion = checkAiDeflection(description);
    if (suggestion && !pendingPayload) {
      setAiSuggestion(suggestion);
      setPendingPayload({ name, description, priority });
      setLoading(false);
      return; // Pause submission to let the user review the AI fix!
    }

    // Proceed with normal ticket submission if no AI match or if user bypassed
    await executeTicketSubmission({ name, description, priority });
  };

  const executeTicketSubmission = async (payload: { name: string; description: string; priority: string }) => {
    setLoading(true);
    try {
      const result = await submitTicket(payload);

      if (result.success) {
        setSuccessMessage("Ticket submitted successfully and routed to AI Copilot queue!");
        setName("");
        setDescription("");
        setPriority("normal");
        setAiSuggestion(null);
        setPendingPayload(null);
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
        Tell us what went wrong and our Tier-0 AI system will instantly check for a solution.
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

      {/* AI Tier-0 Deflection Banner */}
      {aiSuggestion && (
        <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <span>✨ Tier-0 AI Instant Resolution Found</span>
          </div>
          <p className="text-sm text-slate-300 mb-4">{aiSuggestion}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccessMessage("Issue resolved instantly via AI Deflection! No ticket needed.");
                setAiSuggestion(null);
                setPendingPayload(null);
                setDescription("");
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg transition"
            >
              This Solved My Issue 🎉
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingPayload) executeTicketSubmission(pendingPayload);
              }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2 rounded-lg transition"
            >
              Still Need Human Agent 🎧
            </button>
          </div>
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
            placeholder="Describe what happened (e.g. password reset error, API gateway timeout...)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Priority Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Priority Level</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
          >
            <option value="normal">Normal</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Analyzing request..." : "Send ticket"}
        </button>
      </form>

      {/* Floating User AI Assistant */}
      <UserAIAssistant />
    </div>
  );
}