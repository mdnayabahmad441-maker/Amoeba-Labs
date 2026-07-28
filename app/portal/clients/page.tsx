"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Client, CreateClientInput, CLIENT_TYPES, ClientType, Employee } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import FollowupModal from "@/components/Portal/FollowupModal";
import WhatsAppMessageModal from "@/components/Portal/WhatsAppMessageModal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";
import NextActionFields from "@/components/Portal/NextActionFields";
import { nextActionWarnings, NextActionThresholds, toDateTimeLocal } from "@/lib/next-action";
import ActivityTimelineModal from "@/components/Portal/ActivityTimelineModal";

const CLIENT_TYPE_ICONS: Record<ClientType, string> = {
  School: "🏫",
  Hospital: "🏥",
  Business: "🏢",
  Restaurant: "🍽️",
  Clinic: "🩺",
  NGO: "🤝",
  Government: "🏛️",
  Other: "📋",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState("");
  const [followupClient, setFollowupClient] = useState<Client | null>(null);
  const [messageClient, setMessageClient] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [thresholds, setThresholds] = useState<NextActionThresholds>({ noContactDays: 7, stuckLeadDays: 14, clientUpdateDays: 14 });
  const [timelineClient, setTimelineClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState<CreateClientInput>({
    client_name: "",
    client_type: "School",
    owner_name: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    status: "Lead",
    notes: "",
    next_action_type: "", next_action_at: "", communication_channel: "", responsible_employee_id: "", expected_outcome: "", last_contact_at: "", follow_up_priority: "Medium", follow_up_notes: "", client_update_due_at: "",
  });

  const loadData = useCallback(async function loadData() {
    try {
      setLoading(true);

      const { data: ventures } = await supabase
        .from("ventures")
        .select("id")
        .eq("status", "Active")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (!ventures || ventures.length === 0) {
        setError("No active venture found");
        return;
      }

      const vId = ventures[0].id;
      setVentureId(vId);

      let query = supabase
        .from("clients")
        .select("*")
        .eq("venture_id", vId)
        .is("archived_at", null);

      if (searchTerm) {
        query = query.or(
          `client_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }
      if (filterStatus) query = query.eq("status", filterStatus);
      if (filterType) query = query.eq("client_type", filterType);

      const [clientResult, employeeResult, settingsResult] = await Promise.all([
        query.order("created_at", { ascending: false }),
        supabase.from("employees").select("*").eq("venture_id", vId).eq("status", "Active").is("archived_at", null).order("is_founder", { ascending: false }).order("full_name"),
        supabase.from("business_settings").select("no_contact_warning_days, lead_stuck_warning_days, client_update_warning_days").eq("venture_id", vId).maybeSingle(),
      ]);
      const { data, error: err } = clientResult;
      if (err) throw err;
      setClients(data || []);
      if (!employeeResult.error) setEmployees((employeeResult.data || []) as Employee[]);
      if (!settingsResult.error && settingsResult.data) setThresholds({ noContactDays: settingsResult.data.no_contact_warning_days, stuckLeadDays: settingsResult.data.lead_stuck_warning_days, clientUpdateDays: settingsResult.data.client_update_warning_days });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load clients.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function openAddModal() {
    const founder = employees.find((employee) => employee.is_founder);
    setFormData({
      client_name: "",
      client_type: "School",
      owner_name: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      status: "Lead",
      notes: "",
      next_action_type: "", next_action_at: "", communication_channel: "", responsible_employee_id: founder?.id || "", expected_outcome: "", last_contact_at: "", follow_up_priority: "Medium", follow_up_notes: "", client_update_due_at: "",
    });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(client: Client) {
    setFormData({
      client_name: client.client_name,
      client_type: client.client_type,
      owner_name: client.owner_name || "",
      phone: client.phone || "",
      email: client.email || "",
      city: client.city || "",
      state: client.state || "",
      status: client.status,
      notes: client.notes || "",
      next_action_type: client.next_action_type || "",
      next_action_at: toDateTimeLocal(client.next_action_at),
      communication_channel: client.communication_channel || "",
      responsible_employee_id: client.responsible_employee_id || "",
      expected_outcome: client.expected_outcome || "",
      last_contact_at: toDateTimeLocal(client.last_contact_at),
      follow_up_priority: client.follow_up_priority || "Medium",
      follow_up_notes: client.follow_up_notes || "",
      client_update_due_at: toDateTimeLocal(client.client_update_due_at),
    });
    setEditingId(client.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureId) { setError("No active venture. Refresh the page."); return; }
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...formData, next_action_type: formData.next_action_type || null, next_action_at: formData.next_action_at ? new Date(formData.next_action_at).toISOString() : null, communication_channel: formData.communication_channel || null, responsible_employee_id: formData.responsible_employee_id || null, expected_outcome: formData.expected_outcome?.trim() || null, last_contact_at: formData.last_contact_at ? new Date(formData.last_contact_at).toISOString() : null, follow_up_notes: formData.follow_up_notes?.trim() || null, client_update_due_at: formData.client_update_due_at ? new Date(formData.client_update_due_at).toISOString() : null };
      let savedId = editingId;
      if (editingId) {
        const { error: err } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from("clients")
          .insert([{ ...payload, venture_id: ventureId }]).select("id").single();
        if (err) throw err;
        savedId = data.id;
      }
      if (savedId) await supabase.from("activity_logs").insert([{ venture_id: ventureId, record_type: "Client", record_id: savedId, action: editingId ? "next_action_updated" : "client_created", details: { next_action_type: payload.next_action_type, next_action_at: payload.next_action_at, responsible_employee_id: payload.responsible_employee_id, priority: payload.follow_up_priority } }]);
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save client.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Archive this client? It will be removed from active views but retained in business history.")) return;
    try {
      const { error: err } = await supabase.from("clients").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to delete client.");
    }
  }

  async function completeNextAction(client: Client) {
    if (!client.next_action_at || !client.next_action_type) return;
    const outcome = window.prompt("What happened? Add a short outcome note.");
    if (outcome === null) return;
    try {
      const { error: completionError } = await supabase.rpc("complete_primary_next_action", {
        target_type: "Client",
        target_id: client.id,
        outcome_note: outcome.trim() || null,
        replacement_type: null,
        replacement_at: null,
      });
      if (completionError) throw completionError;
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete the next action. Apply the Phase 8 migration first.");
    }
  }

  if (loading) return <LoadingState />;

  const warningCount = clients.filter((client) => nextActionWarnings(client, thresholds).length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl">Clients CRM</h1>
          <p className="text-gray-400">Manage all client accounts and contacts</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition sm:w-auto"
        >
          + Add Client
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {warningCount > 0 && <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 text-sm text-orange-200"><span className="font-bold">{warningCount} client{warningCount === 1 ? "" : "s"}</span> need a next-action or contact review.</div>}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-amber-300/5 border border-amber-300/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <FormSelect
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          placeholder="All Types"
          options={CLIENT_TYPES.map(t => ({ value: t, label: `${CLIENT_TYPE_ICONS[t]} ${t}` }))}
        />
        <FormSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="All Statuses"
          options={[
            { value: "Lead", label: "Lead" },
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
            { value: "Closed", label: "Closed" },
          ]}
        />
      </div>

      {/* Table */}
      {clients.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No clients yet"
          description="Add your first client to get started"
        />
      ) : (
        <DataTable
          data={clients}
          columns={[
            {
              key: "client_name",
              label: "Client Name",
            },
            {
              key: "client_type",
              label: "Type",
              render: (value: ClientType) => (
                <span className="flex items-center gap-1 text-sm">
                  <span>{CLIENT_TYPE_ICONS[value]}</span>
                  <span>{value}</span>
                </span>
              ),
            },
            {
              key: "owner_name",
              label: "Owner",
              render: (value) => value || "-",
            },
            {
              key: "email",
              label: "Email",
              render: (value) => value || "-",
            },
            {
              key: "phone",
              label: "Phone",
              render: (value) => value || "-",
            },
            {
              key: "city",
              label: "City",
              render: (value) => value || "-",
            },
            {
              key: "status",
              label: "Status",
              render: (value) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    value === "Active"
                      ? "bg-green-500/20 text-green-300"
                      : value === "Lead"
                      ? "bg-amber-300/15 text-amber-200"
                      : value === "Inactive"
                      ? "bg-gray-500/20 text-gray-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: "next_action_at",
              label: "Next Action",
              render: (_value, client) => {
                const warnings = nextActionWarnings(client, thresholds);
                const owner = employees.find((employee) => employee.id === client.responsible_employee_id);
                return <div className="space-y-1"><p>{client.next_action_type || "Not set"}{client.next_action_at ? ` · ${new Date(client.next_action_at).toLocaleString("en-IN")}` : ""}</p><p className="text-xs text-gray-500">{owner?.full_name || "Unassigned"} · {client.follow_up_priority || "Medium"}{client.last_contact_at ? ` · Last contact ${new Date(client.last_contact_at).toLocaleDateString("en-IN")}` : " · Never contacted"}</p>{warnings.map((warning) => <span key={warning.code} className={`mr-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${warning.severity === "danger" ? "bg-red-500/15 text-red-300" : "bg-orange-500/15 text-orange-300"}`}>{warning.label}</span>)}{client.next_action_at && <button onClick={() => completeNextAction(client)} className="mt-1 block rounded bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-300 hover:bg-green-500/20">Complete action</button>}</div>;
              },
            },
          ]}
          actions={(client) => (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimelineClient(client)}
                className="text-xs px-2 py-1 bg-white/10 text-gray-200 rounded hover:bg-white/15 transition"
              >
                History
              </button>
              <button
                onClick={() => setMessageClient(client)}
                className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition font-medium"
              >
                WhatsApp
              </button>
              <button
                onClick={() => setFollowupClient(client)}
                className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/30 transition font-medium"
              >
                Follow-up
              </button>
              <button
                onClick={() => openEditModal(client)}
                className="text-xs px-2 py-1 bg-amber-300/20 text-amber-200 rounded hover:bg-amber-300/30 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition"
              >
                Archive
              </button>
            </div>
          )}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Client" : "Add New Client"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Client Name *"
            type="text"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            required
            placeholder="Enter client name"
          />

          <FormSelect
            label="Client Type *"
            value={formData.client_type}
            onChange={(e) =>
              setFormData({ ...formData, client_type: e.target.value as ClientType })
            }
            options={CLIENT_TYPES.map((t) => ({
              value: t,
              label: `${CLIENT_TYPE_ICONS[t]} ${t}`,
            }))}
          />

          <NextActionFields value={formData} employees={employees} onChange={setFormData} />

          <FormInput label="Client update due" type="datetime-local" value={formData.client_update_due_at || ""} onChange={(e) => setFormData({ ...formData, client_update_due_at: e.target.value })} />

          <FormInput
            label="Owner / Contact Name"
            type="text"
            value={formData.owner_name || ""}
            onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
            placeholder="Enter owner name"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="City"
              type="text"
              value={formData.city || ""}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
            />
            <FormInput
              label="State"
              type="text"
              value={formData.state || ""}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
            />
          </div>

          <FormSelect
            label="Status"
            value={formData.status || "Lead"}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as Client["status"] })
            }
            options={[
              { value: "Lead", label: "Lead" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
              { value: "Closed", label: "Closed" },
            ]}
          />

          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add notes about this client"
            rows={3}
          />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-300 hover:bg-amber-400 disabled:bg-amber-300/50 text-black font-semibold py-2 rounded-lg transition"
            >
              {submitting ? "Saving..." : editingId ? "Update Client" : "Add Client"}
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

      {followupClient && (
        <FollowupModal
          isOpen={!!followupClient}
          onClose={() => setFollowupClient(null)}
          onSaved={() => setFollowupClient(null)}
          ventureId={ventureId}
          clientId={followupClient.id}
          contactName={followupClient.client_name}
        />
      )}

      {messageClient && (
        <WhatsAppMessageModal
          isOpen={!!messageClient}
          onClose={() => setMessageClient(null)}
          onSent={() => loadData()}
          ventureId={ventureId}
          clientId={messageClient.id}
          contactName={messageClient.owner_name || messageClient.client_name}
          phone={messageClient.phone}
        />
      )}
      {timelineClient && <ActivityTimelineModal isOpen={Boolean(timelineClient)} onClose={() => setTimelineClient(null)} ventureId={timelineClient.venture_id} recordType="Client" recordId={timelineClient.id} recordName={timelineClient.client_name} />}
    </div>
  );
}
