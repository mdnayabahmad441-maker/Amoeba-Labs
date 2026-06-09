"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Task, CreateTaskInput, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, ErrorState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState<string>("");

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
    status: "To Do",
    assigned_to: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Get venture ID
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

      // Load tasks
      let query = supabase.from("tasks").select("*").eq("venture_id", vId);

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      if (filterPriority) {
        query = query.eq("priority", filterPriority);
      }

      const { data, error: err } = await query.order("due_date", { ascending: true });

      if (err) throw err;
      setTasks(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddTask = () => {
    setFormData({
      title: "",
      description: "",
      due_date: "",
      priority: "Medium",
      status: "To Do",
      assigned_to: "",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || undefined,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to || undefined,
      related_client_id: task.related_client_id || undefined,
      related_lead_id: task.related_lead_id || undefined,
    });
    setEditingId(task.id);
    setShowModal(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update
        const { error: err } = await supabase
          .from("tasks")
          .update(formData)
          .eq("id", editingId);

        if (err) throw err;
      } else {
        // Create
        const { error: err } = await supabase.from("tasks").insert([
          {
            ...formData,
            venture_id: ventureId,
          },
        ]);

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
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error: err } = await supabase.from("tasks").delete().eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function updateStatus(id: string, newStatus: Task["status"]) {
    try {
      const { error: err } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", id);

      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-500/20 text-red-300";
      case "High":
        return "bg-orange-500/20 text-orange-300";
      case "Medium":
        return "bg-yellow-500/20 text-yellow-300";
      case "Low":
        return "bg-green-500/20 text-green-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "bg-green-500/20 text-green-300";
      case "In Progress":
        return "bg-amber-300/15 text-amber-200";
      case "To Do":
        return "bg-gray-500/20 text-gray-300";
      case "Cancelled":
        return "bg-red-500/20 text-red-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  if (loading) return <LoadingState />;

  const filteredTasks = tasks.filter((t) => {
    const statusMatch = !filterStatus || t.status === filterStatus;
    const priorityMatch = !filterPriority || t.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400">Manage your tasks and to-do items</p>
        </div>
        <button
          onClick={handleAddTask}
          className="bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition"
        >
          + Add Task
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="All Statuses"
          options={TASK_STATUSES.map(s => ({ value: s, label: s }))}
        />
        <FormSelect
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          placeholder="All Priorities"
          options={TASK_PRIORITIES.map(p => ({ value: p, label: p }))}
        />
      </div>

      {/* Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No tasks yet"
          description="Create your first task to get organized"
        />
      ) : (
        <DataTable
          data={filteredTasks}
          columns={[
            {
              key: "title",
              label: "Task",
            },
            {
              key: "due_date",
              label: "Due Date",
              render: (value) =>
                value ? new Date(value).toLocaleDateString() : "-",
            },
            {
              key: "priority",
              label: "Priority",
              render: (value) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                    value
                  )}`}
                >
                  {value}
                </span>
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
              key: "assigned_to",
              label: "Assigned To",
              render: (value) => value || "-",
            },
          ]}
          actions={(task) => (
            <div className="flex gap-2">
              <button
                onClick={() => handleEditTask(task)}
                className="text-xs px-2 py-1 bg-amber-300/20 text-amber-200 rounded hover:bg-amber-300/30 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(task.id)}
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
        title={editingId ? "Edit Task" : "Add New Task"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Task Title *"
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            placeholder="Enter task title"
          />

          <FormTextarea
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Add task description"
            rows={3}
          />

          <FormInput
            label="Due Date *"
            type="date"
            value={formData.due_date}
            onChange={(e) =>
              setFormData({ ...formData, due_date: e.target.value })
            }
            required
          />

          <FormSelect
            label="Priority"
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as any,
              })
            }
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: p }))}
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
            options={TASK_STATUSES.map((s) => ({ value: s, label: s }))}
          />

          <FormInput
            label="Assigned To"
            type="text"
            value={formData.assigned_to || ""}
            onChange={(e) =>
              setFormData({ ...formData, assigned_to: e.target.value })
            }
            placeholder="Enter person/team name"
          />

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-300 hover:bg-amber-400 disabled:bg-amber-300/50 text-black font-semibold py-2 rounded-lg transition"
            >
              {submitting ? "Saving..." : "Save Task"}
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
