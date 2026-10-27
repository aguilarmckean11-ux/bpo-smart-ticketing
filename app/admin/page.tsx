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
  assigned_agent?: string;
};

type TabKey = "all" | "open" | "in_progress" | "resolved";
type UserRole = "agent" | "supervisor";
type Language = "en" | "ar";

const DICTIONARY = {
  en: {
    title: "BPO Agent Dashboard",
    subtitle: "Middle East Operations - Smart Queue",
    all: "All",
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    priorityLabel: "Priority:",
    searchPlaceholder: "Search name or description",
    refreshBtn: "Refresh Queue",
    signOut: "Sign Out",
    newNotification: "New customer support ticket received!",
    newTicketsAdded: "new tickets added to queue!",
    dismissRefresh: "Dismiss / Refresh Queue",
    noTickets: "No tickets found in queue.",
    roleAgent: "Agent",
    roleSupervisor: "Supervisor",
    assignedTo: "Assigned To:",
    unassigned: "Unassigned",
    totalTickets: "Total Tickets",
    openQueue: "Open Queue",
    highPriority: "High Priority",
    resolvedToday: "Resolved Today",
    avgHandleTime: "Est. Avg Resolution",
  },
  ar: {
    title: "لوحة تحكم وكيل خدمات BPO",
    subtitle: "عمليات الشرق الأوسط - قائمة الانتظار الذكية",
    all: "الكل",
    open: "مفتوح",
    in_progress: "قيد التنفيذ",
    resolved: "مكتمل",
    priorityLabel: "الأولوية:",
    searchPlaceholder: "البحث باسم العميل أو الوصف",
    refreshBtn: "تحديث القائمة",
    signOut: "تسجيل الخروج",
    newNotification: "تم استلام تذكرة دعم جديدة!",
    newTicketsAdded: "تذاكر جديدة أضيفت للقائمة!",
    dismissRefresh: "تجاهل / تحديث القائمة",
    noTickets: "لم يتم العثور على تذاكر في قائمة الانتظار.",
    roleAgent: "وكيل",
    roleSupervisor: "مشرف العمليات",
    assignedTo: "المسؤول:",
    unassigned: "غير معين",
    totalTickets: "إجمالي التذاكر",
    openQueue: "التذاكر المفتوحة",
    highPriority: "أولوية قصوى",
    resolvedToday: "تم حلها اليوم",
    avgHandleTime: "متوسط وقت الحل",
  },
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // 1. All state hooks at the top
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole>("agent");
  const [lang, setLang] = useState<Language>("en");
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Notification state
  const [newNotificationCount, setNewNotificationCount] = useState<number>(0);
  const [notificationMessage, setNotificationMessage] = useState<string>("");

  const t = DICTIONARY[lang];

  // Play a soft, professional chime using browser Web Audio API
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); 

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

  // 2. Authentication check & role assignment
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        setUserEmail(session.user.email ?? "BPO Agent");
        const isSuper = session.user.email?.includes("admin") || session.user.user_metadata?.role === "supervisor";
        setUserRole(isSuper ? "supervisor" : "agent");
        setLoadingUser(false);
      }
    };
    checkUser();
  }, [router, supabase]);

  // 3. Ticket fetching with silent background polling & notification diffing
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
              setNewNotificationCount((prev) => Math.min(prev + diff, 5));
              setNotificationMessage(
                diff === 1 ? t.newNotification : `${diff} ${t.newTicketsAdded}`
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

  // 4. Background polling effect every 5s
  useEffect(() => {
    fetchTickets(true);
    const interval = setInterval(() => {
      fetchTickets(false);
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

  // 7. Memoized metrics calculation for Option 3
  const metrics = useMemo(() => {
    const total = tickets.length;
    const openCount = tickets.filter((tk) => tk.status === "open").length;
    const highPriorityCount = tickets.filter((tk) => tk.priority?.toLowerCase() === "high").length;
    const resolvedCount = tickets.filter((tk) => tk.status === "resolved").length;

    return {
      total,
      openCount,
      highPriorityCount,
      resolvedCount,
      avgResolution: "14m",
    };
  }, [tickets]);

  // 8. Memoized search & filters
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

  // 9. Conditional loading guard
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 transition-all"
    >
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
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold mx-2">
                  {newNotificationCount >= 5 ? "5+" : newNotificationCount}
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
              {t.dismissRefresh}
            </button>
          </div>
        )}

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{t.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                userRole === "supervisor"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              }`}>
                {userRole === "supervisor" ? t.roleSupervisor : t.roleAgent}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{t.subtitle}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Language Switcher */}
            <button
              onClick={() => setLang((prev) => (prev === "en" ? "ar" : "en"))}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              🌐 {lang === "en" ? "العربية (AR)" : "English (EN)"}
            </button>

            {userEmail && (
              <span className="text-sm text-slate-400 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                👤 {userEmail}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              {t.signOut}
            </button>

            <button
              onClick={() => {
                setNewNotificationCount(0);
                fetchTickets(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <span>{t.refreshBtn}</span>
              {newNotificationCount > 0 && (
                <span className="bg-white text-indigo-900 px-1.5 py-0.2 rounded-full text-xs font-bold">
                  {newNotificationCount >= 5 ? "5+" : newNotificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* 📊 OPTION 3: REAL-TIME BPO ANALYTICS METRICS HEADER */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl">
            <p className="text-slate-400 text-xs font-medium">{t.totalTickets}</p>
            <p className="text-xl font-bold text-white mt-1">{metrics.total}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl">
            <p className="text-slate-400 text-xs font-medium">{t.openQueue}</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{metrics.openCount}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl">
            <p className="text-slate-400 text-xs font-medium">{t.highPriority}</p>
            <p className="text-xl font-bold text-rose-400 mt-1">{metrics.highPriorityCount}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl">
            <p className="text-slate-400 text-xs font-medium">{t.resolvedToday}</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{metrics.resolvedCount}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl col-span-2 md:col-span-1">
            <p className="text-slate-400 text-xs font-medium">{t.avgHandleTime}</p>
            <p className="text-xl font-bold text-indigo-400 mt-1">{metrics.avgResolution}</p>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Filter tickets by status"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {(["all", "open", "in_progress", "resolved"] as TabKey[]).map((key) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(key)}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  {t[key]}
                  <span
                    className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-900 text-slate-300"
                    }`}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>{t.priorityLabel}</span>
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

          <div className="relative w-full lg:w-72">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
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
            <p>{t.noTickets}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-slate-600"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-3 flex-wrap">
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
                  <p dir="auto" className="text-slate-300 text-sm">
                    {ticket.issue_description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {userRole === "supervisor" && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md font-medium">
                      {t.assignedTo} {ticket.assigned_agent || t.unassigned}
                    </span>
                  )}

                  <select
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="open">{t.open}</option>
                    <option value="in_progress">{t.in_progress}</option>
                    <option value="resolved">{t.resolved}</option>
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