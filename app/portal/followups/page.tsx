"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Followup, CreateFollowupInput,
  FOLLOWUP_TYPES, FOLLOWUP_TYPE_ICONS, FollowupType,
  Client, Lead,
} from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";

type FollowupRow = Followup & { contact_name: string; contact_type: "client" | "lead" };

const STATUS_COLORS = {
  Done: "bg-green-500/15 text-green-400 border-green-500/25",
  Pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  Overdue: "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowupRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<CreateFollowupInput>({
    client_id: "",
    lead_id: "",
    type: "Call",
    notes: "",
    follow_up_date: today,
    next_follow_up: "",
    status: "Done",
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data: ventures } = await supabase
        .from("ventures").select("id").eq("status", "Active").limit(1);
      if (!ventures?.length) { setError("No active venture found"); return; }
      const vId = ventures[0].id;
      setVentureId(vId);

      const [fuRes, clientsRes, leadsRes] = await Promise.all([
        supabase.from("followups").select("*").eq("venture_id", vId).order("follow_up_date", { ascending: false }),
        supabase.from("clients").select("id, client_name").eq("venture_id", vId).order("client_name"),
        supabase.from("leads").select("id, client_name").eq("venture_id", vId).order("client_name"),
      ]);

      const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c.client_name]));
      const leadMap = new Map((leadsRes.data || []).map((l: any) => [l.id, l.client_name]));

      setClients((clientsRes.data as Client[]) || []);
      setLeads((leadsRes.data as Lead[]) || []);

      setFollowups(
        (fuRes.data || []).map((f: any) => ({
          ...f,
          contact_name: f.client_id
            ? (clientMap.get(f.client_id) || "Unknown")
            : f.lead_id
            ? (leadMap.get(f.lead_id) || "Unknown Lead")
            : "—",
          contact_type: f.client_id ? "client" : "lead",
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setFormData({
      client_id: "",
      lead_id: "",
      type: "Call",
      notes: "",
      follow_up_date: today,
      next_follow_up: "",
      status: "Done",
    });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(f: FollowupRow) {
    setFormData({
      client_id: f.client_id || "",
      lead_id: f.lead_id || "",
      type: f.type,
      notes: f.notes || "",
      follow_up_date: f.follow_up_date,
      next_follow_up: f.next_follow_up || "",
      status: f.status,
    });
    setEditingId(f.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureId) { setError("No active venture. Refresh."); return; }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        client_id: formData.client_id || null,
        lead_id: formData.lead_id || null,
        next_follow_up: formData.next_follow_up || null,
      };

      if (editingId) {
        const { error: err } = await supabase.from("followups").update(payload).eq("id", editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("followups").insert([{ ...payload, venture_id: ventureId }]);
        if (err) throw err;
      }

      // If next_follow_up set and linked to a lead, update the lead's next_follow_up
      if (formData.next_follow_up && formData.lead_id) {
        await supabase.from("leads")
          .update({ next_follow_up: formData.next_follow_up })
          .eq("id", formData.lead_id);
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markDone(id: string) {
    await supabase.from("followups").update({ status: "Done" }).eq("id", id);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this follow-up?")) return;
    await supabase.from("followups").delete().eq("id", id);
    loadData();
  }

  if (loading) return <LoadingState />;

  const filtered = followups.filter(f => {
    const matchStatus = !filterStatus || f.status === filterStatus;
    const matchType = !filterType || f.type === filterType;
    const matchSearch = !search || f.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.notes || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const todayCount = followups.filter(f => f.follow_up_date === today).length;
  const pendingCount = followups.filter(f => f.status === "Pending").length;
  const overdueCount = followups.filter(f => f.status === "Overdue" || (f.status === "Pending" && f.follow_up_date < today)).length;
  const doneThisWeek = followups.filter(f => {
    const d = new Date(f.follow_up_date);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return f.status === "Done" && d >= weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Follow-ups</h1>
          <p className="text-gray-400 mt-1">Track every client and lead interaction</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2.5 rounded-xl transition text-sm"
        >
          + Log Follow-up
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today", value: todayCount, color: "text-cyan-400", icon: "📅" },
          { label: "Pending", value: pendingCount, color: "text-yellow-400", icon: "⏳" },
          { label: "Overdue", value: overdueCount, color: "text-red-400", icon: "🚨" },
          { label: "Done This Week", value: doneThisWeek, color: "text-green-400", icon: "✅" },
        ].map(s => (
          <div key={s.label} className="bg-white/4 border border-white/8 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by contact or notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white/4 border border-white/8 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 text-sm"
        />
        <FormSelect
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          placeholder="All Types"
          options={FOLLOWUP_TYPES.map(t => ({ value: t, label: `${FOLLOWUP_TYPE_ICONS[t]} ${t}` }))}
        />
        <FormSelect
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          placeholder="All Statuses"
          options={[
            { value: "Pending", label: "⏳ Pending" },
            { value: "Done", label: "✅ Done" },
            { value: "Overdue", label: "🚨 Overdue" },
          ]}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon="📞" title="No follow-ups yet" description="Log your first follow-up to start tracking interactions" />
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const isToday = f.follow_up_date === today;
            return (
              <div key={f.id} className={`bg-white/4 border rounded-xl p-4 transition ${
                isToday ? "border-cyan-500/30" : "border-white/8 hover:border-white/12"
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Type icon + Contact */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-lg shrink-0">
                      {FOLLOWUP_TYPE_ICONS[f.type]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-semibold text-sm">{f.contact_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          f.contact_type === "client"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}>
                          {f.contact_type === "client" ? "Client" : "Lead"}
                        </span>
                        <span className="text-gray-500 text-xs">{f.type}</span>
                      </div>
                      {f.notes && <p className="text-gray-500 text-xs truncate max-w-md">{f.notes}</p>}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-gray-500 shrink-0 sm:text-right">
                    <p className={isToday ? "text-cyan-400 font-medium" : ""}>
                      {isToday ? "Today" : new Date(f.follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    {f.next_follow_up && (
                      <p className="text-gray-600 mt-0.5">Next: {new Date(f.next_follow_up).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[f.status]}`}>
                      {f.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {f.status === "Pending" && (
                      <button onClick={() => markDone(f.id)}
                        className="text-xs px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded-lg hover:bg-green-500/25 transition font-medium">
                        Mark Done
                      </button>
                    )}
                    <button onClick={() => openEditModal(f)}
                      className="text-xs px-3 py-1.5 bg-white/8 text-gray-300 rounded-lg hover:bg-white/12 transition">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(f.id)}
                      className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Follow-up" : "Log Follow-up"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link to Client or Lead */}
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Client (optional)"
              value={formData.client_id || ""}
              onChange={e => setFormData({ ...formData, client_id: e.target.value, lead_id: e.target.value ? "" : formData.lead_id })}
              options={clients.map(c => ({ value: c.id, label: c.client_name }))}
            />
            <FormSelect
              label="Lead (optional)"
              value={formData.lead_id || ""}
              onChange={e => setFormData({ ...formData, lead_id: e.target.value, client_id: e.target.value ? "" : formData.client_id })}
              options={leads.map(l => ({ value: l.id, label: l.client_name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Type *"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as FollowupType })}
              options={FOLLOWUP_TYPES.map(t => ({ value: t, label: `${FOLLOWUP_TYPE_ICONS[t]} ${t}` }))}
              required
            />
            <FormSelect
              label="Status *"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as Followup["status"] })}
              options={[
                { value: "Done", label: "✅ Done" },
                { value: "Pending", label: "⏳ Pending" },
                { value: "Overdue", label: "🚨 Overdue" },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Follow-up Date *"
              type="date"
              value={formData.follow_up_date}
              onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })}
              required
            />
            <FormInput
              label="Next Follow-up"
              type="date"
              value={formData.next_follow_up || ""}
              onChange={e => setFormData({ ...formData, next_follow_up: e.target.value })}
            />
          </div>

          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="What was discussed? Any key points or decisions..."
            rows={4}
          />

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/40 text-black font-bold py-2.5 rounded-xl transition text-sm">
              {submitting ? "Saving..." : editingId ? "Update" : "Log Follow-up"}
            </button>
            <button type="button" onClick={() => setShowModal(false)}
              className="flex-1 bg-white/8 hover:bg-white/12 text-white font-medium py-2.5 rounded-xl transition text-sm">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
