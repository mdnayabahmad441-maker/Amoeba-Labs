"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Venture } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";

interface CreateVentureInput {
  venture_name: string;
  description?: string;
  status?: "Active" | "Inactive" | "Planning";
  venture_kind: Venture["venture_kind"];
}

export default function VenturesPage() {
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateVentureInput>({
    venture_name: "",
    description: "",
    status: "Active",
    venture_kind: "Product / offer",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data, error: err } = await supabase
        .from("ventures")
        .select("*")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("venture_name");

      if (err) throw err;
      setVentures(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load business units.");
    } finally {
      setLoading(false);
    }
  }

  const handleAddVenture = () => {
    setFormData({
      venture_name: "",
      description: "",
      status: "Active",
      venture_kind: "Product / offer",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleEditVenture = (venture: Venture) => {
    setFormData({
      venture_name: venture.venture_name,
      description: venture.description || undefined,
      status: venture.status,
      venture_kind: venture.venture_kind,
    });
    setEditingId(venture.id);
    setShowModal(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update
        const { error: err } = await supabase
          .from("ventures")
          .update(formData)
          .eq("id", editingId);

        if (err) throw err;
      } else {
        // Create
        const { error: err } = await supabase.from("ventures").insert([formData]);

        if (err) throw err;
      }

      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save business unit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(venture: Venture) {
    if (venture.is_default) {
      setError("Choose another default business before archiving Groenics.");
      return;
    }
    if (!confirm("Archive this venture? Its complete business history will be retained.")) return;

    try {
      const { error: err } = await supabase.from("ventures").update({ archived_at: new Date().toISOString(), status: "Inactive" }).eq("id", venture.id);
      if (err) throw err;
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to archive business unit.");
    }
  }

  async function makeDefault(venture: Venture) {
    setError("");
    const { error: defaultError } = await supabase.rpc("set_default_venture", { target_venture: venture.id });
    if (defaultError) {
      setError(defaultError.message);
      return;
    }
    await loadData();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-300";
      case "Inactive":
        return "bg-gray-500/20 text-gray-300";
      case "Planning":
        return "bg-amber-300/15 text-amber-200";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  if (loading) return <LoadingState />;

  const filteredVentures = ventures.filter((v) => !filterStatus || v.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl">Business Units</h1>
          <p className="text-gray-400">Groenics is the operating business. Products and offers stay tagged underneath it.</p>
        </div>
        <button
          onClick={handleAddVenture}
          className="w-full bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition sm:w-auto"
        >
          + Add Business Unit
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Filter */}
      <FormSelect
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        placeholder="All Statuses"
        options={[
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
          { value: "Planning", label: "Planning" },
        ]}
      />

      {/* Table */}
      {filteredVentures.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No ventures yet"
          description="Create your first venture to get started"
        />
      ) : (
        <DataTable
          data={filteredVentures}
          columns={[
            {
              key: "venture_name",
              label: "Name",
              render: (value, venture) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{value}</span>
                  {venture.is_default && <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">Default</span>}
                </div>
              ),
            },
            {
              key: "venture_kind",
              label: "Type",
            },
            {
              key: "description",
              label: "Description",
              render: (value) => (
                <div className="max-w-xs truncate text-sm text-gray-300">
                  {value || "-"}
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (value) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: "created_at",
              label: "Created",
              render: (value) =>
                value ? new Date(value).toLocaleDateString() : "-",
            },
          ]}
          actions={(venture) => (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleEditVenture(venture)}
                className="text-xs px-2 py-1 bg-amber-300/20 text-amber-200 rounded hover:bg-amber-300/30 transition"
              >
                Edit
              </button>
              {!venture.is_default && venture.status === "Active" && (
                <button
                  onClick={() => makeDefault(venture)}
                  className="rounded bg-green-500/15 px-2 py-1 text-xs text-green-300 transition hover:bg-green-500/25"
                >
                  Make default
                </button>
              )}
              <button
                onClick={() => handleDelete(venture)}
                disabled={venture.is_default}
                className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition disabled:cursor-not-allowed disabled:opacity-35"
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
        title={editingId ? "Edit Business Unit" : "Add Business Unit"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Name *"
            type="text"
            value={formData.venture_name}
            onChange={(e) =>
              setFormData({ ...formData, venture_name: e.target.value })
            }
            required
            placeholder="Product, offer, or separately accounted business"
          />

          <FormSelect
            label="Type"
            value={formData.venture_kind}
            onChange={(e) => setFormData({ ...formData, venture_kind: e.target.value as Venture["venture_kind"] })}
            options={[
              { value: "Operating business", label: "Operating business" },
              { value: "Business unit", label: "Business unit" },
              { value: "Product / offer", label: "Product / offer" },
            ]}
          />

          <FormTextarea
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe your venture"
            rows={4}
          />

          <FormSelect
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as CreateVentureInput["status"],
              })
            }
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
              { value: "Planning", label: "Planning" },
            ]}
          />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-300 hover:bg-amber-400 disabled:bg-amber-300/50 text-black font-semibold py-2 rounded-lg transition"
            >
              {submitting ? "Saving..." : "Save Venture"}
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
    </div>
  );
}
