"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Venture } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, ErrorState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";

interface CreateVentureInput {
  venture_name: string;
  description?: string;
  status?: "Active" | "Inactive" | "Planning";
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
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      let query = supabase.from("ventures").select("*");

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      const { data, error: err } = await query.order("created_at", { ascending: false });

      if (err) throw err;
      setVentures(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddVenture = () => {
    setFormData({
      venture_name: "",
      description: "",
      status: "Active",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleEditVenture = (venture: Venture) => {
    setFormData({
      venture_name: venture.venture_name,
      description: venture.description || undefined,
      status: venture.status,
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this venture?")) return;

    try {
      const { error: err } = await supabase.from("ventures").delete().eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-300";
      case "Inactive":
        return "bg-gray-500/20 text-gray-300";
      case "Planning":
        return "bg-blue-500/20 text-blue-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  if (loading) return <LoadingState />;

  const filteredVentures = ventures.filter((v) => !filterStatus || v.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Ventures</h1>
          <p className="text-gray-400">Manage your venture portfolio</p>
        </div>
        <button
          onClick={handleAddVenture}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6 py-3 rounded-lg transition"
        >
          + Add Venture
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
              label: "Venture Name",
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
            <div className="flex gap-2">
              <button
                onClick={() => handleEditVenture(venture)}
                className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(venture.id)}
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
        title={editingId ? "Edit Venture" : "Add New Venture"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Venture Name *"
            type="text"
            value={formData.venture_name}
            onChange={(e) =>
              setFormData({ ...formData, venture_name: e.target.value })
            }
            required
            placeholder="Enter venture name"
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
                status: e.target.value as any,
              })
            }
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
              { value: "Planning", label: "Planning" },
            ]}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-black font-semibold py-2 rounded-lg transition"
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
