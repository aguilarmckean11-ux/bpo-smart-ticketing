"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from '@/lib/formatTime';
import { getTickets, updateTicketStatus, assignTicketAgent, getTicketReplies, addTicketReply } from "../actions";
import { exportToPDF } from '@/lib/exportHelpers';
import FileUpload from "@/components/FileUpload";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { sendTicketUpdateEmail } from "../actions/email";

type Ticket = {
  id: string;
  created_at: string;
  customer_name: string;
  issue_description: string;
  status: string;
  priority?: string;
  assigned_agent?: string;
  is_archived?: boolean;
};

type NotificationItem = {
  id: string | number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
};

type TabKey = "all" | "open" | "in_progress" | "resolved" | "archived";
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
    archived: "Archived",
    analyticsBtn: "Supervisor Analytics",
    queueBtn: "View Ticket Queue",
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
    archiveBtn: "Archive",
  },
  ar: {
    title: "لوحة تحكم وكيل خدمات BPO",
    subtitle: "عمليات الشرق الأوسط - قائمة الانتظار الذكية",
    all: "الكل",
    open: "مفتوح",
    in_progress: "قيد التنفيذ",
    resolved: "مكتمل",
    archived: "المؤرشفة",
    analyticsBtn: "تحليلات المشرفين",
    queueBtn: "عرض قائمة التذاكر",
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
    archiveBtn: "أرشفة",
  },
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
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
  
  // Enhanced Notification Feed State (Compiler-Safe & Persistent)
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("bpo_notifications_persistent_state_v2");
        if (savedData) {
          return JSON.parse(savedData) as NotificationItem[];
        }
      } catch (e) {
        console.error("Failed to load notifications from localStorage:", e);
      }
    }
    return [
      {
        id: 1,
        type: "escalation",
        title: "Tier-2 Support Escalation",
        message: "AI Copilot routed Ticket #TK-1001 to Tier-2 Technical Queue.",
        createdAt: "",
        unread: true,
      },
      {
        id: 2,
        type: "status",
        title: "Customer Status Check",
        message: "Omar Al-Hassan checked ticket resolution status via AI Copilot.",
        createdAt: "",
        unread: true,
      },
    ];
  });

  // Safe client-side timestamp generation to prevent server prerender errors
  useEffect(() => {
    const now = Date.now();
    setNotifications((prev: NotificationItem[]) =>
      prev.map((n, index) => {
        if (n.createdAt) return n;
        const offset = index === 0 ? 2 * 60 * 1000 : 15 * 60 * 1000;
        return {
          ...n,
          createdAt: new Date(now - offset).toISOString(),
        };
      })
    );
  }, []);

  // Save notifications state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bpo_notifications_persistent_state_v2", JSON.stringify(notifications));
      } catch (e) {
        console.error("Failed to save notifications to localStorage:", e);
      }
    }
  }, [notifications]);

  const markNotificationsRead = () => {
    setNotifications((prev: NotificationItem[]) =>
      prev.map((n: NotificationItem) => ({ ...n, unread: false }))
    );
  };

  const unreadCount = notifications.filter((n: NotificationItem) => n.unread).length;
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

              // Collision-proof unique IDs for notification feed items
              const latestNewTickets = result.data.slice(0, diff);
              setNotifications((prevNotifs) => {
                const newAlerts = latestNewTickets.map((tk: Ticket, idx: number) => ({
                  id: `${Date.now()}-${idx}-${tk.id || Math.random().toString(36).substr(2, 5)}`,
                  type: "ticket",
                  title: "New Customer Support Ticket",
                  message: `Ticket #${tk.id?.slice(0, 6) || 'NEW'} submitted by ${tk.customer_name || "Customer"}: "${tk.issue_description?.slice(0, 40)}..."`,
                  createdAt: new Date().toISOString(),
                  unread: true,
                }));
                return [...newAlerts, ...prevNotifs];
              });
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
      if (result.success) {
        const updatedTicket = tickets.find((t) => t.id === id);
        if (updatedTicket) {
await sendTicketUpdateEmail(
  "aguilarmckean11@gmail.com", // Change this to your actual Resend login email
  updatedTicket.customer_name,
  id,
  newStatus
);
        }
      } else {
        console.error("Failed to update status in database:", result.error);
        fetchTickets(false);
      }
    } catch (err) {
      console.error("Exception updating status:", err);
      fetchTickets(false);
    }
  };

  const handleArchiveTicket = async (id: string) => {
    setTickets((prev) =>
      prev.map((tk) => (tk.id === id ? { ...tk, is_archived: true } : tk))
    );

    try {
      const { data, error } = await supabase
        .from("tickets")
        .update({ is_archived: true })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Failed to archive ticket in Supabase:", error.message || error);
        fetchTickets(false);
      } else {
        console.log("Successfully archived ticket:", data);
      }
    } catch (err) {
      console.error("Exception archiving ticket:", err);
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
    const total = tickets.filter(tk => !tk.is_archived).length;
    const openCount = tickets.filter((tk) => !tk.is_archived && tk.status === "open").length;
    const highPriorityCount = tickets.filter((tk) => !tk.is_archived && tk.priority?.toLowerCase() === "high").length;
    const resolvedCount = tickets.filter((tk) => !tk.is_archived && tk.status === "resolved").length;

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
      all: searched.filter((tk) => !tk.is_archived).length,
      open: searched.filter((tk) => !tk.is_archived && tk.status === "open").length,
      in_progress: searched.filter((tk) => !tk.is_archived && tk.status === "in_progress").length,
      resolved: searched.filter((tk) => !tk.is_archived && tk.status === "resolved").length,
      archived: searched.filter((tk) => tk.is_archived).length,
    }),
    [searched]
  );

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (ticket.is_archived && activeTab !== "archived") return false;
      if (!ticket.is_archived && activeTab === "archived") return false;

      const matchesStatus =
        activeTab === "all" ||
        activeTab === "archived" ||
        ticket.status === activeTab;
        
      const ticketPriority = ticket.priority?.toLowerCase() || "normal";
      const matchesPriority =
        priorityFilter === "all" || ticketPriority === priorityFilter;
        
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

            {/* Supervisor Analytics Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2 border ${
                showAnalytics
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
            >
              📊 {showAnalytics ? t.queueBtn : t.analyticsBtn}
            </button>
            
            {/* Export Compliance PDF Button */}
            <button
              type="button"
              onClick={() =>
                exportToPDF({
                  title: "Supervisor Compliance Audit Report",
                  generatedBy: "Admin Supervisor",
                  date: new Date().toLocaleDateString(),
                  tickets: tickets.map((tk: any) => ({
                    id: tk.id,
                    customer: tk.customer_name || "Customer",
                    issue: tk.issue_description || "No description",
                    status: tk.status || "open",
                    priority: tk.priority || "normal",
                  })),
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
            >
              📄 Export Compliance PDF
            </button>

            {/* Notification Bell with Badge & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const nextState = !showNotifications;
                  setShowNotifications(nextState);
                  if (nextState) {
                    markNotificationsRead();
                  }
                }}
                className="relative bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg transition shadow-sm border border-slate-700 flex items-center justify-center text-sm"
                title="Notifications & Escalations"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-100">
                  <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                    <span className="font-semibold text-sm">System & Tier-2 Alerts</span>
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                      {notifications.length} Total
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                    {notifications.map((notif: NotificationItem, index: number) => (
                      <div key={`${notif.id}-${index}`} className="p-3 hover:bg-slate-800/50 transition text-left">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-indigo-400">{notif.title}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400" dir="ltr">
                            <span className="inline-block">{formatRelativeTime(notif.createdAt)}</span>
                            {!notif.unread && (
                              <span className="text-emerald-400 font-bold tracking-tighter" title="Read">
                                ✔️✔️
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-2 bg-slate-800/50 border-t border-slate-700 text-center">
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                    >
                      Close Drawer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setUserRole((prev) => (prev === "agent" ? "supervisor" : "agent"))}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
            >
              {userRole === "supervisor" ? "🛡️ Supervisor View" : "🎧 Agent View"}
            </button>

            {userEmail && (
              <span className="text-sm text-slate-400 font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg" dir="ltr">
                👤 <span className="inline-block">{userEmail}</span>
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
        {!showAnalytics && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* MINIMALIST UNDERLINE TAB BAR */}
            <div
              role="tablist"
              aria-label="Filter tickets by status"
              className="flex items-center gap-4 md:gap-6 border-b border-slate-800 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full lg:w-auto pb-1"
            >
              {(["all", "open", "in_progress", "resolved", "archived"] as TabKey[]).map((key) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(key)}
                    className={`pb-3 text-xs font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap outline-none ${
                      active
                        ? "text-indigo-400 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{t[key]}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        active
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {counts[key]}
                    </span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-in fade-in" />
                    )}
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
        )}

        {/* ANALYTICS VIEW OR TICKET QUEUE LIST */}
        {showAnalytics ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-2">📊 Regional Support Operations Analytics</h2>
              <p className="text-xs text-slate-400 mb-6">Real-time performance metrics and ticket distribution across Middle East queues.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ticket Volume Bar Chart */}
                <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-xl">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-4">Ticket Volume by Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Open', count: tickets.filter(t => !t.is_archived && t.status === 'open').length },
                        { name: 'In Progress', count: tickets.filter(t => !t.is_archived && t.status === 'in_progress').length },
                        { name: 'Resolved', count: tickets.filter(t => !t.is_archived && t.status === 'resolved').length },
                        { name: 'Archived', count: tickets.filter(t => t.is_archived).length },
                      ]}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Breakdown Summary Card */}
                <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">Priority Distribution</h3>
                    <p className="text-xs text-slate-400 mb-4">Breakdown of active operational risk levels.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-xs font-semibold text-rose-400">🔴 High Priority</span>
                      <span className="text-sm font-bold text-white">{tickets.filter(t => !t.is_archived && t.priority?.toLowerCase() === 'high').length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-xs font-semibold text-amber-400">🟡 Medium Priority</span>
                      <span className="text-sm font-bold text-white">{tickets.filter(t => !t.is_archived && t.priority?.toLowerCase() === 'medium').length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-xs font-semibold text-emerald-400">🟢 Normal / Low Priority</span>
                      <span className="text-sm font-bold text-white">{tickets.filter(t => !t.is_archived && (!t.priority || t.priority?.toLowerCase() === 'normal' || t.priority?.toLowerCase() === 'low')).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : loading ? (
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
                    <h3 className="font-semibold text-white inline-block" dir="ltr">
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
                    <span 
                      className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-400 border border-slate-700/80 inline-flex items-center gap-1"
                      title={new Date(ticket.created_at).toLocaleString()}
                      dir="ltr"
                    >
                      <span className="inline-block">⏱️ {formatRelativeTime(ticket.created_at || new Date())}</span>
                    </span>
                  </div>
                  <p dir="auto" className="text-slate-300 text-sm">
                    {ticket.issue_description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
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
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md font-medium inline-block" dir="ltr">
                        {t.assignedTo || "Assigned:"} <span className="inline-block">{ticket.assigned_agent}</span>
                      </span>
                    )
                  )}

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

                  {ticket.status === "resolved" && !ticket.is_archived && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveTicket(ticket.id);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-2.5 py-2 rounded-lg transition"
                      title="Move ticket to historical archive"
                    >
                      📁 {t.archiveBtn}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🤖 AI COPILOT TICKET REPLY DRAWER */}
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
                <h2 className="text-lg font-bold text-white mt-2 inline-block" dir="ltr">{selectedTicket?.customer_name}</h2>
                <p className="text-xs text-slate-400" dir="ltr">Ticket ID: {selectedTicket?.id}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Ticket Issue Summary Box with Status-Aware AI Generator */}
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-xl my-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Original Issue Description</p>
              <p className="text-sm text-slate-200" dir="auto">{selectedTicket?.issue_description}</p>
              
              <button
                onClick={() => {
                  if (!selectedTicket) return;
                  setAiGenerating(true);
                  setTimeout(() => {
                    let draftMessage = "";
                    const status = selectedTicket.status;

                    if (status === "resolved") {
                      draftMessage = `Hello ${selectedTicket.customer_name},\n\nWe are pleased to inform you that your ticket regarding "${selectedTicket.issue_description.slice(0, 40)}..." has been successfully resolved by our engineering operations team.\n\nThank you for your patience and for choosing Middle East Support Operations. If you need any further assistance, please feel free to reach out.\n\nWarm regards,\nBPO Support Team`;
                    } else if (status === "in_progress") {
                      draftMessage = `Hello ${selectedTicket.customer_name},\n\nThis is an update regarding your ongoing support request ("${selectedTicket.issue_description.slice(0, 40)}..."). Our technical team is actively investigating the matter in your region, and we are working diligently toward a resolution.\n\nWe will keep you updated as we make progress.\n\nBest regards,\nBPO Support Team`;
                    } else {
                      draftMessage = `Hello ${selectedTicket.customer_name},\n\nThank you for reaching out to Middle East Support Operations. We have received your request regarding "${selectedTicket.issue_description.slice(0, 40)}..." and have queued it for review.\n\nOur team will follow up with you shortly.\n\nBest regards,\nBPO Support Team`;
                    }

                    setReplyText(draftMessage);
                    setAiGenerating(false);
                  }, 800);
                }}
                disabled={aiGenerating}
                className="mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-2 shadow-md"
              >
                <span>✨ {aiGenerating ? "Generating Smart Reply..." : `Generate AI Draft (${selectedTicket?.status.replace('_', ' ')})`}</span>
              </button>
            </div>

            {/* Secure Document Upload Component */}
            {selectedTicket && (
              <FileUpload 
                ticketId={selectedTicket.id} 
                onUploadComplete={(path) => {
                  console.log("File uploaded successfully to path:", path);
                }} 
              />
            )}

            {/* Conversation Audit History */}
            <div className="flex-1 space-y-3 my-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Activity & Reply Audit Log</p>
              {replies.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800">No previous replies recorded yet. Start the conversation below.</p>
              ) : (
                replies.map((rep, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-sm ${rep.sender_type === 'agent' ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200 ml-4' : 'bg-slate-800/40 border-slate-700/50 text-slate-300 mr-4'}`}>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium" dir="ltr">
                      <span className="inline-block">👤 {rep.sender_email || rep.sender_type}</span>
                      <span className="inline-block">{new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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