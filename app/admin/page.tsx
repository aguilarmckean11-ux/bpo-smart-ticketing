"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTickets, updateTicketStatus } from "../actions";

type Ticket = {
  id: string;
  created_at: string;
  customer_name: string;
  issue_description: string;
  status: string;
  priority?: string;
};

type TabKey = "all" | "open" | "in_progress" | "resolved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // 1. All state hooks at the top
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Notification state
  const [newNotificationCount, setNewNotificationCount] = useState<number>(0);
  const [notificationMessage, setNotificationMessage] = useState<string>("");

  // Play a soft, professional chime using browser Web Audio API (no external audio files needed)
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 pitch
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 pitch

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  // 2. Authentication check effect
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        setUserEmail(session.user.email ?? "BPO Agent");
        setLoadingUser(false);
      }
    };
    checkUser();
  }, [router, supabase]);

  // 3. Ticket fetching with intelligent diffing & notification triggers
  const fetchTickets = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const result = await getTickets();
      if (result.success && result.data) {
        setTickets((prevTickets) => {
          if (!isInitial && prevTickets.length > 0) {
            const diff = result.data.length - prevTickets.length;
            if (diff > 0) {
              playNotificationSound();
              setNewNotificationCount((prev) => Math.min(prev + diff, 5)); // Stacks 1 to 5+
              setNotificationMessage(
                diff === 1 
                  ? "New customer support ticket received!" 
                  : `${diff} new tickets added to queue!`
              );
            }
          }
          return result.data;
        });
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // 4. Silent background polling every 5s
  useEffect(() => {
    fetchTickets(true); // Full loader on initial page mount only
    const interval = setInterval(() => {
      fetchTickets(false); // Silent check in background
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 5. Sign out handler
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // 6. Status update handler
  const updateStatus = async (id: string, newStatus: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      const result = await updateTicketStatus(id, newStatus);
      if (!result.success) {
        console.error("Failed to update status in database:", result.error);
        fetchTickets(false);
      }
    } catch (err) {
      console.error("Exception updating status:", err);
      fetchTickets(false);
    }
  };

  // 7. Memoized search & filters
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

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = activeTab === "all" || ticket.status === activeTab;
      const ticketPriority = ticket.priority?.toLowerCase() || "normal";
      const matchesPriority = priorityFilter === "all" || ticketPriority === priorityFilter;
      const matchesSearch =
        ticket.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        ticket.issue_description.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, activeTab, priorityFilter, search]);

  // 8. Conditional loading guard (COMES LAST, AFTER ALL HOOKS)
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 🔔 PROFESSIONAL FLOATING NOTIFICATION BANNER */}
        {newNotificationCount > 0 && (
          <div className="bg-indigo-600/90 border border-indigo-400/30 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between backdrop-blur-md transition-all">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <p className="text-sm font-semibold">
                🔔 {notificationMessage} 
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold ml-2">
                  {newNotificationCount >= 5 ? "5+" : newNotificationCount} new
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                setNewNotificationCount(0);
                fetchTickets(false);
              }}
              className="bg-white text-indigo-900 hover:bg-indigo-50 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Dismiss / Refresh Queue
            </button>
          </div>
        )}

        {/* HEADER */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">BPO Agent Dashboard</h1>
            <p className="text-slate-400 text-sm">Middle East Operations - Smart Queue</p>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-sm text-slate-400 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                👤 {userEmail}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Sign Out
            </button>

            <button
              onClick={() => {
                setNewNotificationCount(0);
                fetchTickets(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <span>Refresh Queue</span>
              {newNotificationCount > 0 && (
                <span className="bg-white text-indigo-900 px-1.5 py-0.2 rounded-full text-xs font-bold">
                  {newNotificationCount >= 5 ? "5+" : newNotificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* FILTERS & SEARCH */}
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

          <div className="flex items-center gap-2 mt-4 mb-2 text-xs font-semibold text-slate-400">
            <span>Priority:</span>
            {["all", "high", "medium", "low", "normal"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                  priorityFilter === p
                    ? "bg-slate-700 text-white font-bold border border-slate-600"
                    : "hover:bg-slate-800/60 text-slate-400"
                }`}
              >
                {p}
              </button>
            ))}
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

        {/* TICKET QUEUE LIST */}
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
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-slate-600"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {ticket.customer_name}
                    </h3>
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