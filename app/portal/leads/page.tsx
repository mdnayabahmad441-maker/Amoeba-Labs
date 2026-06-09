"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lead, CreateLeadInput, LEAD_STAGES } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import FollowupModal from "@/components/Portal/FollowupModal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState("");
  const [followupLead, setFollowupLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState<CreateLeadInput>({
    client_name: "",
    contact_person: "",
    phone: "",
    email: "",
    source: "",
    stage: "New Lead",
    notes: "",
    next_follow_up: "",
  });

  useEffect(() => {
    loadData();
  }, [searchTerm, filterStage]);

  async function loadData() {
    try {
      setLoading(true);

      const { data: ventures } = await supabase
        .from("ventures")
        .select("id")
        .eq("status", "Active")
        .limit(1);

      if (!ventures || ventures.length === 0) {
        setError("No active venture found");
        return;
      }

      const vId = ventures[0].id;
      setVentureId(vId);

      let query = supabase.from("leads").select("*").eq("venture_id", vId);

      if (searchTerm) {
        query = query.or(
          `client_name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }
      if (filterStage) query = query.eq("stage", filterStage);

      const { data, error: err } = await query.order("created_at", { ascending: false });
      if (err) throw err;
      setLeads(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setFormData({
      client_name: "",
      contact_person: "",
      phone: "",
      email: "",
      source: "",
      stage: "New Lead",
      notes: "",
      next_follow_up: "",
    });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(lead: Lead) {
    setFormData({
      client_name: lead.client_name,
      contact_person: lead.contact_person || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      stage: lead.stage,
      notes: lead.notes || "",
      next_follow_up: lead.next_follow_up || "",
    });
    setEditingId(lead.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from("leads")
          .update(formData)
          .eq("id", editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("leads")
          .insert([{ ...formData, venture_id: ventureId }]);
        if (err) throw err;
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const { error: err } = await supabase.from("leads").delete().eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "New Lead": return "bg-amber-300/15 text-amber-200";
      case "Contacted": return "bg-stone-300/10 text-stone-300";
      case "Demo Scheduled": return "bg-yellow-500/20 text-yellow-300";
      case "Proposal Sent": return "bg-orange-500/20 text-orange-300";
      case "Negotiation": return "bg-amber-500/20 text-amber-300";
      case "Closed Won": return "bg-green-500/20 text-green-300";
      case "Closed Lost": return "bg-red-500/20 text-red-300";
      default: return "bg-gray-500/20 text-gray-300";
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Leads CRM</h1>
          <p className="text-gray-400">Track and manage your sales pipeline</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition"
        >
          + Add Lead
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Search leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-amber-300/5 border border-amber-300/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <FormSelect
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          placeholder="All Stages"
          options={LEAD_STAGES.map(s => ({ value: s, label: s }))}
        />
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No leads yet"
          description="Create your first lead to start tracking your sales pipeline"
        />
      ) : (
        <DataTable
          data={leads}
          columns={[
            { key: "client_name", label: "Client Name" },
            {
              key: "contact_person",
              label: "Contact",
              render: (value) => value || "-",
            },
            {
              key: "email",
              label: "Email",
              render: (value) => value || "-",
            },
            {
              key: "stage",
              label: "Stage",
              render: (value) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(value)}`}>
                  {value}
                </span>
              ),
            },
            {
              key: "next_follow_up",
              label: "Follow-Up",
              render: (value) => value ? new Date(value).toLocaleDateString() : "-",
            },
          ]}
          actions={(lead) => (
            <div className="flex gap-2">
              <button
                onClick={() => setFollowupLead(lead)}
                className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/30 transition font-medium"
              >
                Follow-up
              </button>
              <button
                onClick={() => openEditModal(lead)}
                className="text-xs px-2 py-1 bg-amber-300/20 text-amber-200 rounded hover:bg-amber-300/30 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(lead.id)}
                className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition"
              >
                Delete
              </button>
            </div>
          )}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Lead" : "Add New Lead"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Client / Organization Name *"
            type="text"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            required
            placeholder="Enter client or organization name"
          />

          <FormInput
            label="Contact Person"
            type="text"
            value={formData.contact_person || ""}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="Enter contact person name"
          />

          <FormInput
            label="Email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email"
          />

          <FormInput
            label="Phone"
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />

          <FormInput
            label="Source"
            type="text"
            value={formData.source || ""}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            placeholder="e.g. Referral, Website, Cold Call"
          />

          <FormSelect
            label="Stage"
            value={formData.stage || "New Lead"}
            onChange={(e) =>
              setFormData({ ...formData, stage: e.target.value as Lead["stage"] })
            }
            options={LEAD_STAGES.map((s) => ({ value: s, label: s }))}
          />

          <FormInput
            label="Next Follow-Up"
            type="date"
            value={formData.next_follow_up || ""}
            onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
          />

          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add notes about this lead"
            rows={3}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-300 hover:bg-amber-400 disabled:bg-amber-300/50 text-black font-semibold py-2 rounded-lg transition"
            >
              {submitting ? "Saving..." : editingId ? "Update Lead" : "Add Lead"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick follow-up modal */}
      {followupLead && (
        <FollowupModal
          isOpen={!!followupLead}
          onClose={() => setFollowupLead(null)}
          onSaved={() => { setFollowupLead(null); loadData(); }}
          ventureId={ventureId}
          leadId={followupLead.id}
          contactName={followupLead.client_name}
        />
      )}
    </div>
  );
}
