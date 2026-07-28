"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Employee, Task, CreateTaskInput, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";
import WhatsAppMessageModal from "@/components/Portal/WhatsAppMessageModal";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [messageTask, setMessageTask] = useState<Task | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState<string>("");
  const [notifyOnSave, setNotifyOnSave] = useState(false);

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
    status: "To Do",
    assigned_employee_id: "",
    assigned_to: "",
    assigned_to_phone: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Get venture ID
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

      let query = supabase.from("tasks").select("*").eq("venture_id", vId).is("archived_at", null);

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      if (filterPriority) {
        query = query.eq("priority", filterPriority);
      }

      const [tasksRes, employeesRes] = await Promise.all([
        query.order("due_date", { ascending: true }),
        supabase
          .from("employees")
          .select("*")
          .eq("venture_id", vId)
          .eq("status", "Active")
          .is("archived_at", null)
          .order("is_founder", { ascending: false })
          .order("full_name", { ascending: true }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      setTasks((tasksRes.data as Task[]) || []);

      if (employeesRes.error) {
        setEmployees([]);
        if (String(employeesRes.error.message || "").includes("employees")) {
          setError("Run EMPLOYEES_UPGRADE.sql in Supabase SQL Editor to assign tasks from the employee list.");
        }
      } else {
        setEmployees((employeesRes.data as Employee[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [filterPriority, filterStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const handleAddTask = () => {
    setFormData({
      title: "",
      description: "",
      due_date: "",
      priority: "Medium",
      status: "To Do",
      assigned_employee_id: employees.find((employee) => employee.is_founder)?.id || "",
      assigned_to: "",
      assigned_to_phone: "",
    });
    setEditingId(null);
    setNotifyOnSave(false);
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || undefined,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      assigned_employee_id: task.assigned_employee_id || undefined,
      assigned_to: task.assigned_to || undefined,
      assigned_to_phone: task.assigned_to_phone || undefined,
      related_client_id: task.related_client_id || undefined,
      related_lead_id: task.related_lead_id || undefined,
    });
    setEditingId(task.id);
    setNotifyOnSave(false);
    setShowModal(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        assigned_employee_id: formData.assigned_employee_id || null,
        assigned_to: formData.assigned_to?.trim() || null,
        assigned_to_phone: formData.assigned_to_phone?.trim() || null,
      };
      let savedTask: Task | null = null;

      if (editingId) {
        const { data, error: err } = await supabase
          .from("tasks")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single();

        if (err) throw err;
        savedTask = data as Task;
      } else {
        const { data, error: err } = await supabase.from("tasks").insert([
          {
            ...payload,
            venture_id: ventureId,
          },
        ]).select("*").single();

        if (err) throw err;
        savedTask = data as Task;
      }

      setShowModal(false);
      await loadData();

      if (notifyOnSave && savedTask) {
        if (savedTask.assigned_to_phone) {
          setMessageTask(savedTask);
        } else {
          setError("Task saved, but no WhatsApp number was added for notification.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save task.");
    } finally {
      setSubmitting(false);
    }
  }

  function taskNotificationMessage(task: Task) {
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN") : "Not set";
    const description = task.description ? `\n\nDetails: ${task.description}` : "";

    return [
      `Hi ${task.assigned_to || "there"}, this is Nayab from Groenics.`,
      "",
      "I am handing over this task to you:",
      `Task: ${task.title}`,
      `Due date: ${dueDate}`,
      `Priority: ${task.priority}`,
      `Status: ${task.status}${description}`,
      "",
      "Please confirm once you have seen this.",
    ].join("\n");
  }

  function handleEmployeePick(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    setFormData({
      ...formData,
      assigned_employee_id: employeeId || undefined,
      assigned_to: employee?.full_name || formData.assigned_to || "",
      assigned_to_phone: employee?.phone || formData.assigned_to_phone || "",
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Archive this task? Its execution history will be retained.")) return;

    try {
      const { error: err } = await supabase.from("tasks").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task.");
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl">Tasks</h1>
          <p className="text-gray-400">Manage your tasks and to-do items</p>
        </div>
        <button
          onClick={handleAddTask}
          className="w-full bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition sm:w-auto"
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
              label: "Handed Over To",
              render: (value) => value || "-",
            },
            {
              key: "assigned_employee_id",
              label: "Employee",
              render: (value) => employees.find((employee) => employee.id === value)?.full_name || "-",
            },
            {
              key: "assigned_to_phone",
              label: "WhatsApp",
              render: (value) => value || "-",
            },
          ]}
          actions={(task) => (
            <div className="flex flex-wrap gap-2">
              {task.assigned_to_phone && (
                <button
                  onClick={() => setMessageTask(task)}
                  className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition"
                >
                  WhatsApp
                </button>
              )}
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
                priority: e.target.value as Task["priority"],
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
                status: e.target.value as Task["status"],
              })
            }
            options={TASK_STATUSES.map((s) => ({ value: s, label: s }))}
          />

          <FormSelect
            label="Assign Employee"
            value={formData.assigned_employee_id || ""}
            onChange={(e) => handleEmployeePick(e.target.value)}
            placeholder={employees.length ? "Select employee" : "No employees added"}
            options={employees.map((employee) => ({
              value: employee.id,
              label: `${employee.full_name}${employee.role ? ` - ${employee.role}` : ""}`,
            }))}
          />

          <FormInput
            label="Hand Over To"
            type="text"
            value={formData.assigned_to || ""}
            onChange={(e) =>
              setFormData({ ...formData, assigned_to: e.target.value })
            }
            placeholder="Enter person or team name"
          />

          <FormInput
            label="WhatsApp Number"
            type="tel"
            value={formData.assigned_to_phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, assigned_to_phone: e.target.value })
            }
            placeholder="Enter handover WhatsApp number"
          />

          <label className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-3">
            <input
              type="checkbox"
              checked={notifyOnSave}
              onChange={(e) => setNotifyOnSave(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-green-500/40 bg-black/20 accent-green-400"
            />
            <span>
              <span className="block text-sm font-semibold text-green-300">Open WhatsApp notification after saving</span>
              <span className="mt-1 block text-xs leading-relaxed text-green-200/70">
                The task handover message will open with the task title, due date, priority, and description filled in.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
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

      {messageTask && (
        <WhatsAppMessageModal
          isOpen={!!messageTask}
          onClose={() => setMessageTask(null)}
          ventureId={ventureId}
          contactName={messageTask.assigned_to || "Task owner"}
          phone={messageTask.assigned_to_phone}
          defaultMessageType="task"
          initialMessage={taskNotificationMessage(messageTask)}
        />
      )}
    </div>
  );
}
