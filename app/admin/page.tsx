"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTickets, updateTicketStatus, assignTicketAgent, getTicketReplies, addTicketReply } from "../actions";

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

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole>("agent");
  const [lang, setLang] = useState<Language>("en");
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // AI Drawer State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  // Notification state
  const [newNotificationCount, setNewNotificationCount] = useState<number>(0);
  const [notificationMessage, setNotificationMessage] = useState<string>("");

  const t = DICTIONARY[lang];

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

  useEffect(() => {
    fetchTickets(true);
    const interval = setInterval(() => {
      fetchTickets(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const supabaseClient = createClient();
    await supabaseClient.auth.signOut();
    router.push("/auth/login");
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setTickets((prev) =>
      prev.map((tk) => (tk.id === id ? { ...tk, status: newStatus } : tk))
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

  const openTicketDrawer = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");
    const res = await getTicketReplies(ticket.id);
    if (res.success && res.data) {
      setReplies(res.data);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    const newReply = {
      ticket_id: selectedTicket.id,
      sender_type: "agent",
      sender_email: userEmail || "agent@bpo.com",
      message: replyText,
      created_at: new Date().toISOString(),
    };

    setReplies((prev) => [...prev, newReply]);
    const textToSend = replyText;
    setReplyText("");

    await addTicketReply(selectedTicket.id, "agent", userEmail || "agent@bpo.com", textToSend);
  };

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

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (tk) =>
        tk.customer_name?.toLowerCase().includes(q) ||
        tk.issue_description?.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      all: searched.length,
      open: searched.filter((tk) => tk.status === "open").length,
      in_progress: searched.filter((tk) => tk.status === "in_progress").length,
      resolved: searched.filter((tk) => tk.status === "resolved").length,
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
        
        {/* NOTIFICATION BANNER */}
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
            <button
              onClick={() => setLang((prev) => (prev === "en" ? "ar" : "en"))}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              🌐 {lang === "en" ? "العربية (AR)" : "English (EN)"}
            </button>

            <button
              onClick={() => setUserRole((prev) => (prev === "agent" ? "supervisor" : "agent"))}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
            >
              {userRole === "supervisor" ? "🛡️ Supervisor View" : "🎧 Agent View"}
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

        {/* METRICS */}
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
                onClick={() => openTicketDrawer(ticket)}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-indigo-500/50 cursor-pointer"
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
                    <span dir="ltr" className="text-xs text-slate-400">
                      {new Date(ticket.created_at).toLocaleTimeString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
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
                  {/* Supervisor Interactive Assignment Dropdown */}
                  {userRole === "supervisor" ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-amber-400 font-medium">{t.assignedTo || "Assigned:"}</span>
                      <select
                        value={ticket.assigned_agent || ""}
                        onChange={(e) => {
                          const newAgent = e.target.value;
                          setTickets((prev) =>
                            prev.map((tk) => (tk.id === ticket.id ? { ...tk, assigned_agent: newAgent } : tk))
                          );
                          assignTicketAgent(ticket.id, newAgent);
                        }}
                        className="bg-slate-900 border border-amber-500/30 text-amber-300 text-xs rounded-lg p-1.5 focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">{t.unassigned || "Unassigned"}</option>
                        <option value="agent.test@bpo-middleeast.com">agent.test@bpo-middleeast.com</option>
                        <option value="agent.egypt@bpo-middleeast.com">agent.egypt@bpo-middleeast.com</option>
                        <option value="agent.gulf@bpo-middleeast.com">agent.gulf@bpo-middleeast.com</option>
                      </select>
                    </div>
                  ) : (
                    ticket.assigned_agent && (
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md font-medium">
                        {t.assignedTo || "Assigned:"} {ticket.assigned_agent}
                      </span>
                    )
                  )}

                  {/* Status Dropdown with stopPropagation */}
                  <select
                    value={ticket.status}
                    onClick={(e) => e.stopPropagation()}
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

{/* 🤖 OPTION C: AI COPILOT TICKET REPLY DRAWER */}
      {selectedTicket && (
        <div 
          onClick={() => setSelectedTicket(null)}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto p-6 transition-transform duration-300 ease-in-out animate-in slide-in-from-right"
          >
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                  AI Copilot & Audit Trail
                </span>
                <h2 className="text-lg font-bold text-white mt-2">{selectedTicket?.customer_name}</h2>
                <p className="text-xs text-slate-400">Ticket ID: {selectedTicket?.id}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Ticket Issue Summary Box */}
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-xl my-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Original Issue Description</p>
              <p className="text-sm text-slate-200" dir="auto">{selectedTicket?.issue_description}</p>
              
              <button
                onClick={() => {
                  if (!selectedTicket) return;
                  setAiGenerating(true);
                  setTimeout(() => {
                    setReplyText(`Hello ${selectedTicket.customer_name},\n\nThank you for reaching out to Middle East Support Operations. We have reviewed your report regarding "${selectedTicket.issue_description.slice(0, 40)}..." and our engineering team is actively investigating the cluster status. We will provide an update shortly.\n\nBest regards,\nBPO Support Team`);
                    setAiGenerating(false);
                  }, 800);
                }}
                disabled={aiGenerating}
                className="mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-2 shadow-md"
              >
                <span>✨ {aiGenerating ? "Generating Smart Reply..." : "Generate AI Draft Response"}</span>
              </button>
            </div>

            {/* Conversation Audit History */}
            <div className="flex-1 space-y-3 my-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Activity & Reply Audit Log</p>
              {replies.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800">No previous replies recorded yet. Start the conversation below.</p>
              ) : (
                replies.map((rep, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-sm ${rep.sender_type === 'agent' ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200 ml-4' : 'bg-slate-800/40 border-slate-700/50 text-slate-300 mr-4'}`}>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
                      <span>👤 {rep.sender_email || rep.sender_type}</span>
                      <span>{new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p dir="auto">{rep.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input & Approval Action */}
            <div className="border-t border-slate-800 pt-4 mt-auto space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Draft / Edit Reply (Human-in-the-Loop)</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response or generate an AI draft..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                dir="auto"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">🔒 AI-assisted; reviewed & approved by agent.</span>
                <button
                  onClick={handleSendReply}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg flex items-center gap-2"
                >
                  <span>Approve & Send Reply</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}