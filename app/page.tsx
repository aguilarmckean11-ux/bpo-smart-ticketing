"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ceajjyatwfstfcustkur.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlYWp5eWF0d2ZzdGZjdXN0a3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjU3MDMsImV4cCI6MjEwODUwMTcwM30.h65iHwzCcTQAducgcsFUQgwhb5Ajn3y1j-w1VK1LYHE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Status = "idle" | "submitting" | "success" | "error";
export default function SupportPage() {
  const [customerName, setCustomerName] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isSubmitting = status === "submitting";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setStatus("submitting");
    setErrorMessage("");

    const { error } = await supabase.from("tickets").insert({
      customer_name: customerName.trim(),
      issue_description: issueDescription.trim(),
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setCustomerName("");
    setIssueDescription("");
    setStatus("success");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            How can we help?
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Tell us what went wrong and we&apos;ll open a ticket for our support
            team.
          </p>
        </header>

        {status === "success" && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.296a1 1 0 010 1.408l-7.5 7.5a1 1 0 01-1.408 0l-3.5-3.5a1 1 0 111.408-1.408L8.5 12.092l6.796-6.796a1 1 0 011.408 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">
                Ticket sent
              </p>
              <p className="mt-0.5 text-sm text-emerald-800">
                Thanks, we&apos;ve received your request and will follow up
                soon.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              aria-label="Dismiss"
              className="rounded-md p-1 text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
              !
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                We couldn&apos;t send your ticket
              </p>
              <p className="mt-0.5 text-sm text-red-800">
                {errorMessage || "Something went wrong."} Check your connection
                and try again.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="customer_name"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Your name
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              required
              autoComplete="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="issue_description"
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              What&apos;s the issue?
            </label>
            <textarea
              id="issue_description"
              name="issue_description"
              required
              rows={6}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Describe what happened, what you expected, and any steps to reproduce it."
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isSubmitting && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="4"
                />
                <path
                  d="M22 12a10 10 0 00-10-10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {isSubmitting ? "Sending…" : "Send ticket"}
          </button>
        </form>
      </div>
    </main>
  );
}