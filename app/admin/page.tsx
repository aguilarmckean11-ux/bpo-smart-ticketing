"use client";

import { useEffect, useMemo, useState } from "react";
import { getTickets, updateTicketStatus } from "../actions";

type Ticket = {
  id: string;
  created_at: string;
  customer_name: string;
  issue_description: string;
  status: string;
  priority?: string;
};

const FALLBACK_TICKETS: Ticket[] = [
  {
    id: "1",
    created_at: new Date().toISOString(),
    customer_name: "Ahmad Al-Mansoor",
    issue_description: "Payment gateway checkout failing on AED currency transactions.",
    status: "open",
    priority: "high",
  },
  {
    id: "2",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    customer_name: "Fatima Al-Zahra",
    issue_description: "Requesting bilingual Arabic/English support agent for enterprise onboarding.",
    status: "in_progress",
    priority: "medium",
  },
  {
    id: "3",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    customer_name: "Tariq Hassan",
    issue_description: "API webhook timeout error during peak Dubai office hours.",
    status: "resolved",
    priority: "high",
  },
  {
    id: "4",
    created_at: new Date(Date.now() - 10800000).toISOString(),
    customer_name: "Laila El-Sayed",
    issue_description: "Order confirmation SMS notifications delayed across GCC carriers.",
    status: "open",
    priority: "low",
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
      const result = await getTickets();

      if (result.success && result.data) {
        setTickets(result.data);
      } else {
        console.warn("Using fallback tickets due to fetch error:", result.error);
        setTickets(FALLBACK_TICKETS);
      }
    } catch (err) {
      console.error("Fetch exception:", err);
      setTickets(FALLBACK_TICKETS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Automatically check for new tickets every 5 seconds in the background
    const interval = setInterval(() => {
      fetchTickets();
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  
  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistically update local UI state immediately for responsiveness
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      // Persist change to Supabase database via Server Action
      const result = await updateTicketStatus(id, newStatus);
      if (!result.success) {
        console.error("Failed to update status in database:", result.error);
        fetchTickets(); // Fallback: refetch fresh data if server update fails
      }
    } catch (err) {
      console.error("Exception updating status:", err);
      fetchTickets();
    }
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
          <button
            onClick={fetchTickets}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition"
          >
            Refresh Queue
          </button>
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
            <input
              id="ticket-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or description"
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg py-2.5 px-3 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">
            Loading tickets...
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="text-slate-400 text-center py-12 bg-slate-800/50 rounded-xl border border-slate-800">
            <p>No tickets found in queue.</p>
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
                    {/* Priority Badge */}
  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
    ticket.priority === 'high' 
      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
      : ticket.priority === 'medium'
      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  }`}>
    {ticket.priority || 'normal'}
  </span>
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