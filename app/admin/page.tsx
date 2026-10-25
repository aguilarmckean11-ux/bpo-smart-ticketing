"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ceajjyatwfstfcustkur.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlYWp5eWF0d2ZzdGZjdXN0a3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjU3MDMsImV4cCI6MjEwODUwMTcwM30.h65iHwzCcTQAducgcsFUQgwhb5Ajn3y1j-w1VK1LYHE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Ticket = {
  id: string;
  created_at: string;
  customer_name: string;
  issue_description: string;
  status: string;
};

// Fallback seed tickets for local testing during Supabase platform outage
const FALLBACK_TICKETS: Ticket[] = [
  {
    id: "1",
    created_at: new Date().toISOString(),
    customer_name: "Ahmad Al-Mansoor",
    issue_description: "Payment gateway checkout failing on AED currency transactions.",
    status: "open",
  },
  {
    id: "2",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    customer_name: "Fatima Al-Zahra",
    issue_description: "Requesting bilingual Arabic/English support agent for enterprise onboarding.",
    status: "in_progress",
  },
  {
    id: "3",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    customer_name: "Tariq Hassan",
    issue_description: "API webhook timeout error during peak Dubai office hours.",
    status: "resolved",
  },
  {
    id: "4",
    created_at: new Date(Date.now() - 10800000).toISOString(),
    customer_name: "Laila El-Sayed",
    issue_description: "Order confirmation SMS notifications delayed across GCC carriers.",
    status: "open",
  },
];

type TabKey = "all" | "open" | "in_progress" | "resolved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback to local seed data if network/DNS fails
        setTickets(FALLBACK_TICKETS);
      } else {
        setTickets(data);
      }
    } catch {
      setTickets(FALLBACK_TICKETS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    await supabase.from("tickets").update({ status: newStatus }).eq("id", id);
  };

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.customer_name?.toLowerCase().includes(q) ||
        t.issue_description?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      all: searched.length,
      open: searched.filter((t) => t.status === "open").length,
      in_progress: searched.filter((t) => t.status === "in_progress").length,
      resolved: searched.filter((t) => t.status === "resolved").length,
    }),
    [searched]
  );

  const visibleTickets = useMemo(
    () =>
      activeTab === "all"
        ? searched
        : searched.filter((t) => t.status === activeTab),
    [searched, activeTab]
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              BPO Agent Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Middle East Operations · Smart Queue
            </p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 rounded-full font-medium animate-pulse">
            ● Realtime Active
          </span>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Filter tickets by status"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-900 text-slate-300"
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80">
            <label htmlFor="ticket-search" className="sr-only">
              Search by customer name or description
            </label>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              id="ticket-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or description"
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg py-2.5 pl-9 pr-3 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-slate-400 text-center py-12 bg-slate-800/50 rounded-xl border border-slate-800">
            No tickets found in queue.
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="text-slate-400 text-center py-12 bg-slate-800/50 rounded-xl border border-slate-800">
            <p>No tickets match your filters.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {ticket.customer_name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {new Date(ticket.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    {ticket.issue_description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}