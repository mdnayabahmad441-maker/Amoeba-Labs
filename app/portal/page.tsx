"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Task, Lead, Invoice, Followup, FOLLOWUP_TYPE_ICONS } from "@/lib/types";
import Link from "next/link";
import { LoadingState, ErrorState } from "@/components/Portal/States";

interface Stats {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  tasksDueToday: number;
}

interface LeadPipeline {
  stage: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPayments, setRecentPayments] = useState<(Invoice & { client_name: string })[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [pipeline, setPipeline] = useState<LeadPipeline[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<(Invoice & { client_name: string })[]>([]);
  const [todayFollowups, setTodayFollowups] = useState<(Followup & { contact_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);

      const { data: ventures } = await supabase
        .from("ventures").select("id").eq("status", "Active").limit(1);

      if (!ventures?.length) { setError("No active venture found"); return; }
      const vId = ventures[0].id;

      const today = new Date().toISOString().split("T")[0];

      const [clientsRes, leadsRes, invoicesRes, tasksRes, followupsRes] = await Promise.all([
        supabase.from("clients").select("id, status, client_name").eq("venture_id", vId),
        supabase.from("leads").select("*").eq("venture_id", vId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").eq("venture_id", vId).order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("venture_id", vId),
        supabase.from("followups").select("*, clients(client_name), leads(client_name)")
          .eq("venture_id", vId).eq("follow_up_date", today).neq("status", "Done"),
      ]);

      const clientNameMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c.client_name]));
      const leadNameMap = new Map((leadsRes.data || []).map((l: any) => [l.id, l.client_name]));

      const invoices: (Invoice & { client_name: string })[] = (invoicesRes.data || []).map((inv: any) => ({
        ...inv,
        client_name: clientNameMap.get(inv.client_id) || "Unknown Client",
      }));

      const leads: Lead[] = leadsRes.data || [];
      const clients = clientsRes.data || [];
      const tasks: Task[] = tasksRes.data || [];

      // Today's pending follow-ups
      setTodayFollowups(
        (followupsRes.data || []).map((f: any) => ({
          ...f,
          contact_name: f.client_id
            ? (clientNameMap.get(f.client_id) || "Unknown")
            : (leadNameMap.get(f.lead_id) || "Unknown"),
        }))
      );

      // Stats
      setStats({
        totalRevenue: invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
        pendingAmount: invoices.filter(i => i.status === "Sent" || i.status === "Draft").reduce((s, i) => s + i.amount, 0),
        overdueAmount: invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0),
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === "Active").length,
        totalLeads: leads.length,
        tasksDueToday: tasks.filter(t => t.due_date === today && t.status !== "Done").length,
      });

      // Recent paid invoices
      setRecentPayments(invoices.filter(i => i.status === "Paid").slice(0, 5));

      // Overdue
      setOverdueInvoices(invoices.filter(i => i.status === "Overdue").slice(0, 3));

      // Recent leads
      setRecentLeads(leads.slice(0, 6));

      // Pipeline counts
      const stageOrder = ["New Lead", "Contacted", "Demo Scheduled", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];
      const stageCounts = stageOrder.map(stage => ({
        stage,
        count: leads.filter(l => l.stage === stage).length,
      }));
      setPipeline(stageCounts);

      // Upcoming tasks
      const sevenDaysAhead = new Date();
      sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
      setUpcomingTasks(
        tasks
          .filter(t => t.due_date >= today && t.due_date <= sevenDaysAhead.toISOString().split("T")[0] && t.status !== "Done")
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
          .slice(0, 5)
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return <ErrorState message="Failed to load dashboard" />;

  const stageColors: Record<string, string> = {
    "New Lead": "bg-blue-500",
    "Contacted": "bg-purple-500",
    "Demo Scheduled": "bg-yellow-500",
    "Proposal Sent": "bg-orange-500",
    "Negotiation": "bg-amber-500",
    "Closed Won": "bg-green-500",
    "Closed Lost": "bg-red-500",
  };

  const priorityColors: Record<string, string> = {
    Urgent: "text-red-400",
    High: "text-orange-400",
    Medium: "text-yellow-400",
    Low: "text-green-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Your business at a glance</p>
      </div>

      {/* Overdue alert */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-300 font-semibold text-sm">
              {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} — total ₹{stats.overdueAmount.toLocaleString()}
            </p>
            <p className="text-red-400/70 text-xs mt-0.5">
              {overdueInvoices.map(i => i.client_name).join(", ")}
            </p>
          </div>
          <Link href="/portal/billing" className="text-xs text-red-300 hover:text-red-200 underline shrink-0">
            View →
          </Link>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, sub: "Paid invoices", icon: "💰", color: "text-green-400" },
          { label: "Pending Payments", value: `₹${stats.pendingAmount.toLocaleString()}`, sub: "Awaiting payment", icon: "⏳", color: "text-yellow-400" },
          { label: "Total Clients", value: stats.totalClients, sub: `${stats.activeClients} active`, icon: "🏢", color: "text-cyan-400" },
          { label: "Total Leads", value: stats.totalLeads, sub: "In pipeline", icon: "👥", color: "text-purple-400" },
        ].map(card => (
          <div key={card.label} className="bg-white/4 border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-xs text-gray-500">{card.sub}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color} mb-0.5`}>{card.value}</div>
            <div className="text-gray-400 text-xs">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Recent Payments */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">💳 Recent Payments</h2>
            <Link href="/portal/billing" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-gray-500 text-sm">No payments recorded yet</p>
          ) : (
            <div className="space-y-2.5">
              {recentPayments.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-white/4 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{inv.client_name}</p>
                    <p className="text-gray-500 text-xs">{inv.invoice_number} · {new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-sm">₹{inv.amount.toLocaleString()}</p>
                    <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Enquiries / Leads */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">📥 Recent Enquiries</h2>
            <Link href="/portal/leads" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-sm">No enquiries yet</p>
          ) : (
            <div className="space-y-2.5">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-white/4 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{lead.client_name}</p>
                    <p className="text-gray-500 text-xs">{lead.contact_person || "—"} · {new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    lead.stage === "Closed Won" ? "bg-green-500/15 text-green-400" :
                    lead.stage === "Closed Lost" ? "bg-red-500/15 text-red-400" :
                    lead.stage === "New Lead" ? "bg-blue-500/15 text-blue-400" :
                    "bg-yellow-500/15 text-yellow-400"
                  }`}>
                    {lead.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Pipeline */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">📊 Lead Pipeline</h2>
            <Link href="/portal/leads" className="text-xs text-cyan-400 hover:text-cyan-300">Manage →</Link>
          </div>
          <div className="space-y-2.5">
            {pipeline.filter(p => p.count > 0).length === 0 ? (
              <p className="text-gray-500 text-sm">No leads in pipeline</p>
            ) : (
              pipeline.map(p => (
                <div key={p.stage} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <span className="text-gray-400 text-xs">{p.stage}</span>
                  </div>
                  <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stageColors[p.stage] || "bg-gray-500"}`}
                      style={{ width: `${Math.min((p.count / Math.max(stats.totalLeads, 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-bold w-5 text-right shrink-0">{p.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">✅ Upcoming Tasks</h2>
            <Link href="/portal/tasks" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks due this week</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingTasks.map(task => {
                const isToday = task.due_date === new Date().toISOString().split("T")[0];
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-white/4 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{task.title}</p>
                      <p className={`text-xs mt-0.5 ${isToday ? "text-red-400 font-medium" : "text-gray-500"}`}>
                        {isToday ? "Due today" : `Due ${new Date(task.due_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${priorityColors[task.priority] || "text-gray-400"}`}>
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today's tasks count */}
      {stats.tasksDueToday > 0 && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-xl">📌</span>
          <p className="text-cyan-300 text-sm">
            You have <span className="font-bold">{stats.tasksDueToday} task{stats.tasksDueToday > 1 ? "s" : ""}</span> due today.
          </p>
          <Link href="/portal/tasks" className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 underline shrink-0">
            View tasks →
          </Link>
        </div>
      )}

      {/* Follow-ups due today */}
      {todayFollowups.length > 0 && (
        <div className="bg-white/4 border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">📞 Follow-ups Due Today</h2>
            <Link href="/portal/followups" className="text-xs text-yellow-400 hover:text-yellow-300">View all →</Link>
          </div>
          <div className="space-y-2.5">
            {todayFollowups.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-white/4 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{FOLLOWUP_TYPE_ICONS[f.type]}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{f.contact_name}</p>
                    <p className="text-gray-500 text-xs">{f.type}{f.notes ? ` · ${f.notes.slice(0, 40)}` : ""}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 font-medium">
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
