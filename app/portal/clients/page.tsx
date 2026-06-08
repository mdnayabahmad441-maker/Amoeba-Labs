"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Client, CreateClientInput, CLIENT_TYPES, ClientType } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import FollowupModal from "@/components/Portal/FollowupModal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";

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
  });

  useEffect(() => {
    loadData();
  }, [searchTerm, filterStatus, filterType]);

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

      let query = supabase
        .from("clients")
        .select("*")
        .eq("venture_id", vId);

      if (searchTerm) {
        query = query.or(
          `client_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }
      if (filterStatus) query = query.eq("status", filterStatus);
      if (filterType) query = query.eq("client_type", filterType);

      const { data, error: err } = await query.order("created_at", { ascending: false });
      if (err) throw err;
      setClients(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
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
      if (editingId) {
        const { error: err } = await supabase
          .from("clients")
          .update(formData)
          .eq("id", editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("clients")
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
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      const { error: err } = await supabase.from("clients").delete().eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Clients CRM</h1>
          <p className="text-gray-400">Manage all client accounts and contacts</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6 py-3 rounded-lg transition"
        >
          + Add Client
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                      ? "bg-blue-500/20 text-blue-300"
                      : value === "Inactive"
                      ? "bg-gray-500/20 text-gray-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {value}
                </span>
              ),
            },
          ]}
          actions={(client) => (
            <div className="flex gap-2">
              <button
                onClick={() => setFollowupClient(client)}
                className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/30 transition font-medium"
              >
                Follow-up
              </button>
              <button
                onClick={() => openEditModal(client)}
                className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(client.id)}
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-black font-semibold py-2 rounded-lg transition"
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
    </div>
  );
}
