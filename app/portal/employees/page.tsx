"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CreateEmployeeInput, Employee, EMPLOYEE_STATUSES } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import EmployeeIdCardModal from "@/components/Portal/EmployeeIdCardModal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { EmptyState, LoadingState } from "@/components/Portal/States";

function employeeErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: unknown }).message || "");
    if (message.includes("employees")) {
      return `${message}. Run EMPLOYEES_UPGRADE.sql in Supabase SQL Editor, then refresh this page.`;
    }
    return message || "Unable to load employees.";
  }

  return "Unable to load employees. Run EMPLOYEES_UPGRADE.sql in Supabase SQL Editor, then refresh this page.";
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ventureId, setVentureId] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [idCardEmployee, setIdCardEmployee] = useState<Employee | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateEmployeeInput>({
    full_name: "",
    role: "",
    department: "",
    phone: "",
    email: "",
    status: "Active",
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data: ventures, error: ventureError } = await supabase
        .from("ventures")
        .select("id")
        .eq("status", "Active")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (ventureError) throw ventureError;
      if (!ventures?.length) {
        setError("No active venture found.");
        return;
      }

      const activeVentureId = ventures[0].id as string;
      setVentureId(activeVentureId);

      let query = supabase
        .from("employees")
        .select("*")
        .eq("venture_id", activeVentureId)
        .is("archived_at", null);

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      const { data, error: employeesError } = await query.order("full_name", { ascending: true });
      if (employeesError) throw employeesError;

      setEmployees((data as Employee[]) || []);
    } catch (err) {
      setError(employeeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) =>
      [employee.full_name, employee.role, employee.department, employee.phone, employee.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [employees, search]);

  const totals = useMemo(() => ({
    total: employees.length,
    active: employees.filter((employee) => employee.status === "Active").length,
    inactive: employees.filter((employee) => employee.status === "Inactive").length,
  }), [employees]);

  function openAddModal() {
    setFormData({
      full_name: "",
      role: "",
      department: "",
      phone: "",
      email: "",
      status: "Active",
      notes: "",
    });
    setEditingId(null);
    setPhotoFile(null);
    setShowModal(true);
  }

  function openEditModal(employee: Employee) {
    setFormData({
      full_name: employee.full_name,
      role: employee.role || "",
      department: employee.department || "",
      phone: employee.phone || "",
      email: employee.email || "",
      status: employee.status,
      notes: employee.notes || "",
    });
    setEditingId(employee.id);
    setPhotoFile(null);
    setShowModal(true);
  }

  async function uploadEmployeePhoto(employeeId: string, file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error("Use a JPG, PNG, or WebP photo up to 5 MB.");
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const photoPath = `${ventureId}/${employeeId}/photo.${extension}`;
    const { error: uploadError } = await supabase.storage.from("employee-photos").upload(photoPath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = supabase.storage.from("employee-photos").getPublicUrl(photoPath);
    // Supabase Storage keeps the same path on replacement; version the URL so browsers fetch the new image.
    const versionedPhotoUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
    const { error: photoUpdateError } = await supabase.from("employees").update({ photo_url: versionedPhotoUrl }).eq("id", employeeId);
    if (photoUpdateError) throw photoUpdateError;
    return versionedPhotoUrl;
  }

  async function handleIdCardPhotoUpload(file: File) {
    if (!idCardEmployee) return;
    try {
      const photoUrl = await uploadEmployeePhoto(idCardEmployee.id, file);
      const updatedEmployee = { ...idCardEmployee, photo_url: photoUrl };
      setIdCardEmployee(updatedEmployee);
      setEmployees((current) => current.map((employee) => employee.id === updatedEmployee.id ? updatedEmployee : employee));
    } catch (err) {
      setError(employeeErrorMessage(err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureId) {
      setError("No active venture found. Refresh the page.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      full_name: formData.full_name.trim(),
      role: formData.role?.trim() || null,
      department: formData.department?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      status: formData.status || "Active",
      notes: formData.notes?.trim() || null,
    };

    try {
      let employeeId = editingId;
      if (editingId) {
        const { error: updateError } = await supabase.from("employees").update(payload).eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { data: insertedEmployee, error: insertError } = await supabase.from("employees").insert([{ ...payload, venture_id: ventureId }]).select("id").single();
        if (insertError) throw insertError;
        employeeId = insertedEmployee.id;
      }

      if (photoFile && employeeId) {
        await uploadEmployeePhoto(employeeId, photoFile);
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(employeeErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(employee: Employee) {
    if (employee.is_founder) {
      setError("The founder assignment record must remain active.");
      return;
    }
    if (!confirm(`Archive ${employee.full_name}? Assignments and historical records will be retained.`)) return;

    try {
      const { error: deleteError } = await supabase.from("employees").update({ archived_at: new Date().toISOString(), status: "Inactive" }).eq("id", employee.id);
      if (deleteError) throw deleteError;
      await loadData();
    } catch (err) {
      setError(employeeErrorMessage(err));
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Employees</h1>
          <p className="mt-1 text-gray-400">Assignment records for internal work. Employees do not receive portal login access.</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 sm:w-auto"
        >
          + Add Employee
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Total Employees", value: totals.total, color: "text-white", border: "border-white/10" },
          { label: "Active", value: totals.active, color: "text-green-400", border: "border-green-500/20" },
          { label: "Inactive", value: totals.inactive, color: "text-gray-400", border: "border-gray-500/20" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border ${stat.border} bg-black/20 p-5`}>
            <p className="mb-2 text-xs uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-amber-300/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-gray-600 transition focus:border-amber-300/50 focus:outline-none"
        />
        <FormSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="All Statuses"
          options={EMPLOYEE_STATUSES.map((status) => ({ value: status, label: status }))}
        />
      </div>

      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon="Team"
          title="No employees found"
          description="Add employees so tasks can be handed over quickly"
        />
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="rounded-xl border border-amber-300/10 bg-black/20 p-4 transition hover:border-white/12">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{employee.full_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      employee.status === "Active" ? "bg-green-500/15 text-green-300" : "bg-gray-500/20 text-gray-300"
                    }`}>
                      {employee.status}
                    </span>
                    {employee.is_founder && <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-xs font-semibold text-amber-200">Default owner</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{employee.role || "No role"}</span>
                    <span>{employee.department || "No department"}</span>
                    <span>{employee.phone || "No WhatsApp"}</span>
                    {employee.email && <span>{employee.email}</span>}
                  </div>
                  {employee.notes && <p className="mt-2 text-sm text-gray-400">{employee.notes}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIdCardEmployee(employee)}
                    className="rounded-lg bg-sky-400/15 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/25"
                  >
                    ID Card
                  </button>
                  <button
                    onClick={() => openEditModal(employee)}
                    className="rounded-lg bg-amber-300/20 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-300/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    disabled={employee.is_founder}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Employee" : "Add Employee"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Full Name *"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Employee name"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Role"
              value={formData.role || ""}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Operations, designer, sales..."
            />
            <FormInput
              label="Department"
              value={formData.department || ""}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Team or function"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="WhatsApp Number"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone / WhatsApp"
            />
            <FormInput
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email address"
            />
          </div>

          <FormSelect
            label="Status"
            value={formData.status || "Active"}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee["status"] })}
            options={EMPLOYEE_STATUSES.map((status) => ({ value: status, label: status }))}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Employee Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="block w-full cursor-pointer rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-gray-400 file:mr-3 file:rounded-md file:border-0 file:bg-amber-300/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-200"
            />
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP · maximum 5 MB.</p>
          </div>

          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Skills, working hours, responsibilities..."
            rows={3}
          />

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-amber-300 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 disabled:bg-amber-300/40"
            >
              {submitting ? "Saving..." : editingId ? "Update Employee" : "Add Employee"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 rounded-xl bg-white/8 py-2.5 text-sm font-medium text-white transition hover:bg-white/12"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <EmployeeIdCardModal
        employee={idCardEmployee}
        onClose={() => setIdCardEmployee(null)}
        onPhotoUpload={handleIdCardPhotoUpload}
      />
    </div>
  );
}
