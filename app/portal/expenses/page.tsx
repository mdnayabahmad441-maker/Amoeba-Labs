"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CreateExpenseInput,
  Employee,
  Expense,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { EmptyState, LoadingState } from "@/components/Portal/States";

const today = () => new Date().toISOString().split("T")[0];

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function monthEnd(date: string) {
  const [year, month] = date.split("-").map(Number);
  return new Date(year, month, 0).toISOString().split("T")[0];
}

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function expensesErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: unknown }).message || "");
    if (message.includes("expenses")) {
      return `${message}. Run DAILY_EXPENSES_UPGRADE.sql in Supabase SQL Editor, then refresh this page.`;
    }
    return message || "Unable to load expenses.";
  }

  return "Unable to load expenses. Run DAILY_EXPENSES_UPGRADE.sql in Supabase SQL Editor, then refresh this page.";
}

const CATEGORY_COLORS: Record<string, string> = {
  Software: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  Marketing: "bg-pink-500/15 text-pink-300 border-pink-500/20",
  Travel: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  Office: "bg-stone-500/15 text-stone-300 border-stone-500/20",
  Utilities: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  Team: "bg-green-500/15 text-green-300 border-green-500/20",
  "Client Work": "bg-amber-300/15 text-amber-200 border-amber-300/20",
  Food: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  Miscellaneous: "bg-gray-500/15 text-gray-300 border-gray-500/20",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ventureId, setVentureId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [viewMode, setViewMode] = useState<"day" | "month" | "all" | "range">("day");
  const [selectedDate, setSelectedDate] = useState(today());
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [rangeEnd, setRangeEnd] = useState(today());
  const [formData, setFormData] = useState<CreateExpenseInput>({
    expense_date: today(),
    category: "Miscellaneous",
    amount: 0,
    payment_method: "UPI",
    vendor: "",
    paid_by: "",
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

      const { data: employeesData, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("venture_id", activeVentureId)
        .eq("status", "Active")
        .is("archived_at", null)
        .order("full_name", { ascending: true });

      if (employeeError) throw employeeError;
      setEmployees((employeesData as Employee[]) || []);

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("venture_id", activeVentureId)
        .is("archived_at", null);

      if (viewMode === "day") {
        query = query.eq("expense_date", selectedDate);
      } else if (viewMode === "month") {
        query = query.gte("expense_date", monthStart(selectedDate)).lte("expense_date", monthEnd(selectedDate));
      } else if (viewMode === "range") {
        query = query.gte("expense_date", rangeStart).lte("expense_date", rangeEnd);
      }

      if (filterCategory) {
        query = query.eq("category", filterCategory);
      }

      const { data, error: expensesError } = await query
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses((data as Expense[]) || []);
    } catch (err) {
      setError(expensesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterCategory, rangeEnd, rangeStart, selectedDate, viewMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expenses;

    return expenses.filter((expense) =>
      [expense.vendor, expense.paid_by, expense.notes, expense.category, expense.payment_method]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [expenses, search]);

  const totals = useMemo(() => {
    const total = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const daysWithExpenses = new Set(filteredExpenses.map((expense) => expense.expense_date)).size;
    const dailyAverage = viewMode === "month" || viewMode === "all" || viewMode === "range" ? total / Math.max(daysWithExpenses, 1) : total;
    const largest = filteredExpenses.reduce((max, expense) => Math.max(max, Number(expense.amount || 0)), 0);
    const byCategory = filteredExpenses.reduce<Record<string, number>>((summary, expense) => {
      summary[expense.category] = (summary[expense.category] || 0) + Number(expense.amount || 0);
      return summary;
    }, {});

    return { total, dailyAverage, largest, byCategory };
  }, [filteredExpenses, viewMode]);

  const categoryRows = Object.entries(totals.byCategory).sort((a, b) => b[1] - a[1]);

  function openAddModal() {
    setFormData({
      expense_date: selectedDate,
      category: "Miscellaneous",
      amount: 0,
      payment_method: "UPI",
      vendor: "",
      paid_by: "",
      notes: "",
    });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(expense: Expense) {
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      amount: Number(expense.amount || 0),
      payment_method: expense.payment_method,
      vendor: expense.vendor || "",
      paid_by: expense.paid_by || "",
      notes: expense.notes || "",
    });
    setEditingId(expense.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureId) {
      setError("No active venture found. Refresh the page.");
      return;
    }
    if (Number(formData.amount || 0) <= 0) {
      setError("Enter an expense amount greater than zero.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      expense_date: formData.expense_date,
      category: formData.category,
      amount: Number(formData.amount || 0),
      payment_method: formData.payment_method,
      vendor: formData.vendor?.trim() || null,
      paid_by: formData.paid_by?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    try {
      if (editingId) {
        const { error: updateError } = await supabase.from("expenses").update(payload).eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("expenses").insert([{ ...payload, venture_id: ventureId }]);
        if (insertError) throw insertError;
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(expensesErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Archive this expense? The financial record will be retained for audit history.")) return;

    try {
      const { error: deleteError } = await supabase.from("expenses").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (deleteError) throw deleteError;
      await loadData();
    } catch (err) {
      setError(expensesErrorMessage(err));
    }
  }

  function exportCsv() {
    const header = ["Date", "Category", "Amount", "Payment Method", "Vendor", "Paid By", "Notes"];
    const rows = filteredExpenses.map((expense) => [
      expense.expense_date,
      expense.category,
      String(expense.amount),
      expense.payment_method,
      expense.vendor || "",
      expense.paid_by || "",
      expense.notes || "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filenameDate =
      viewMode === "all"
        ? "all"
        : viewMode === "range"
        ? `${rangeStart}-${rangeEnd}`
        : selectedDate;
    link.download = `expenses-${viewMode}-${filenameDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Daily Expense Tracker</h1>
          <p className="mt-1 text-gray-400">Track spend by day, month, category, vendor, and payment method</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={exportCsv}
            disabled={filteredExpenses.length === 0}
            className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={openAddModal}
            className="rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Expenses",
            value: money(totals.total),
            color: "text-amber-200",
            border: "border-amber-300/20",
            subtitle:
              viewMode === "day"
                ? new Date(selectedDate).toLocaleDateString("en-IN")
                : viewMode === "month"
                ? selectedDate.slice(0, 7)
                : viewMode === "range"
                ? `${rangeStart} to ${rangeEnd}`
                : "All recorded expenses",
          },
          { label: "Entries", value: String(filteredExpenses.length), color: "text-white", border: "border-white/10" },
          { label: viewMode === "day" ? "Day Total" : viewMode === "month" ? "Daily Average" : "Average / Day", value: money(totals.dailyAverage), color: "text-green-400", border: "border-green-500/20" },
          { label: "Largest Expense", value: money(totals.largest), color: "text-red-300", border: "border-red-500/20" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border ${stat.border} bg-black/20 p-5`}>
            <p className="mb-2 text-xs uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            {stat.subtitle && <p className="mt-1 text-xs text-gray-500">{stat.subtitle}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_1fr_220px]">
        <FormSelect
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as "day" | "month" | "all" | "range")}
          placeholder="Select view"
          options={[
            { value: "day", label: "Day" },
            { value: "month", label: "Month" },
            { value: "range", label: "Date Range" },
            { value: "all", label: "All Time" },
          ]}
          className="lg:col-span-1"
        />

        <div className="space-y-3 lg:col-span-1">
          {viewMode === "day" && (
            <FormInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {viewMode === "month" && (
            <FormInput
              type="month"
              value={selectedDate.slice(0, 7)}
              onChange={(e) => setSelectedDate(`${e.target.value}-01`)}
            />
          )}

          {viewMode === "range" && (
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                type="date"
                label="From"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
              <FormInput
                type="date"
                label="To"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </div>
          )}

          {viewMode === "all" && (
            <div className="rounded-xl border border-amber-300/10 bg-black/20 p-4 text-sm text-gray-300">
              Showing all expenses for this venture
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Search vendor, notes, paid by..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-amber-300/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-gray-600 transition focus:border-amber-300/50 focus:outline-none"
        />
        <FormSelect
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          placeholder="All Categories"
          options={EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }))}
        />
      </div>

      {categoryRows.length > 0 && (
        <div className="rounded-xl border border-amber-300/10 bg-black/20 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold text-white">Category Split</h2>
            <span className="text-xs text-gray-500">{money(totals.total)} total</span>
          </div>
          <div className="space-y-3">
            {categoryRows.map(([category, amount]) => (
              <div key={category} className="grid grid-cols-[110px_1fr_88px] items-center gap-3 sm:grid-cols-[150px_1fr_120px]">
                <span className="truncate text-xs text-gray-400">{category}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-amber-300"
                    style={{ width: `${Math.min((amount / Math.max(totals.total, 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-right text-xs font-semibold text-white">{money(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon="Rs"
          title="No expenses found"
          description="Add your first expense for the selected period"
        />
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="rounded-xl border border-amber-300/10 bg-black/20 p-4 transition hover:border-white/12">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Miscellaneous}`}>
                      {expense.category}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(expense.expense_date).toLocaleDateString("en-IN")}</span>
                    <span className="text-xs text-gray-500">-</span>
                    <span className="text-xs text-gray-400">{expense.payment_method}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{expense.vendor || "Unlabeled expense"}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                    {expense.paid_by && <span>Paid by {expense.paid_by}</span>}
                    {expense.notes && <span className="min-w-0 truncate">{expense.notes}</span>}
                  </div>
                </div>

                <div className="text-left lg:min-w-35 lg:text-right">
                  <p className="text-xl font-bold text-amber-200">{money(Number(expense.amount || 0))}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditModal(expense)}
                    className="rounded-lg bg-white/8 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/12"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
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
        title={editingId ? "Edit Expense" : "Add Expense"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Date *"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
            <FormInput
              label="Amount *"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as CreateExpenseInput["category"] })}
              options={EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }))}
              required
            />
            <FormSelect
              label="Payment Method"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as CreateExpenseInput["payment_method"] })}
              options={PAYMENT_METHODS.map((method) => ({ value: method, label: method }))}
              required
            />
          </div>

          <FormInput
            label="Vendor"
            value={formData.vendor || ""}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            placeholder="Supplier, platform, shop, or person"
          />
          <FormSelect
            label="Paid By"
            value={formData.paid_by || ""}
            onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
            placeholder="Select employee"
            options={[
              { value: "", label: "Not specified" },
              ...employees.map((employee) => ({
                value: employee.full_name,
                label: employee.full_name,
              })),
            ]}
          />
          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="What was this expense for?"
            rows={3}
          />

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-amber-300 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 disabled:bg-amber-300/40"
            >
              {submitting ? "Saving..." : editingId ? "Update Expense" : "Save Expense"}
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
    </div>
  );
}
