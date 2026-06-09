"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Invoice, Client, CreateInvoiceInput, INVOICE_STATUSES } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";

type InvoiceWithClient = Invoice & { client_name: string };

const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-green-500/15 text-green-400 border-green-500/20",
  Sent: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Draft: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Overdue: "bg-red-500/15 text-red-400 border-red-500/20",
  Cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState("");

  const [formData, setFormData] = useState<CreateInvoiceInput>({
    client_id: "",
    amount: 0,
    invoice_number: "",
    due_date: "",
    status: "Draft",
    notes: "",
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

      const [clientsRes, invoicesRes] = await Promise.all([
        supabase.from("clients").select("*").eq("venture_id", vId).order("client_name"),
        supabase
          .from("invoices")
          .select("*")
          .eq("venture_id", vId)
          .order("created_at", { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const clientList = (clientsRes.data as Client[]) || [];
      const clientMap = new Map(clientList.map(c => [c.id, c.client_name]));

      setClients(clientList);
      setInvoices(
        (invoicesRes.data || []).map((inv: any) => ({
          ...inv,
          client_name: clientMap.get(inv.client_id) || "Unknown Client",
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function nextInvoiceNumber(existing: InvoiceWithClient[]): string {
    const nums = existing
      .map(i => parseInt(i.invoice_number.replace(/\D/g, ""), 10))
      .filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `INV-${String(next).padStart(3, "0")}`;
  }

  function openAddModal() {
    setFormData({
      client_id: clients[0]?.id ?? "",
      amount: 0,
      invoice_number: nextInvoiceNumber(invoices),
      due_date: "",
      status: "Draft",
      notes: "",
    });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(inv: InvoiceWithClient) {
    setFormData({
      client_id: inv.client_id,
      amount: inv.amount,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date,
      status: inv.status,
      notes: inv.notes || "",
    });
    setEditingId(inv.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.client_id) { setError("Please select a client."); return; }
    if (!ventureId) { setError("No active venture found. Refresh the page."); return; }
    setError("");
    setSubmitting(true);
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from("invoices").update(formData).eq("id", editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("invoices").insert([{ ...formData, venture_id: ventureId }]);
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

  async function markAsPaid(id: string) {
    try {
      const { error: err } = await supabase
        .from("invoices")
        .update({ status: "Paid" })
        .eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function updateStatus(id: string, status: Invoice["status"]) {
    try {
      const { error: err } = await supabase
        .from("invoices").update({ status }).eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice?")) return;
    try {
      const { error: err } = await supabase.from("invoices").delete().eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function printInvoice(inv: InvoiceWithClient) {
    const issueDate = new Date(inv.created_at).toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });
    const dueDate = new Date(inv.due_date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; }
    .page { max-width: 720px; margin: 40px auto; padding: 48px; border: 1px solid #e5e7eb; border-radius: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand h1 { font-size: 22px; font-weight: 800; color: #071a35; letter-spacing: -0.5px; }
    .brand p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .inv-num { font-size: 28px; font-weight: 800; color: #071a35; }
    .invoice-meta .inv-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
    .status-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      background: ${inv.status === "Paid" ? "#dcfce7" : inv.status === "Overdue" ? "#fee2e2" : "#fef9c3"};
      color: ${inv.status === "Paid" ? "#166534" : inv.status === "Overdue" ? "#991b1b" : "#854d0e"};
    }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .info-block label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; display: block; margin-bottom: 6px; }
    .info-block p { font-size: 14px; color: #111; font-weight: 500; }
    .info-block small { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead th { background: #f9fafb; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    tbody td { padding: 14px; font-size: 13px; color: #111; border-bottom: 1px solid #f3f4f6; }
    .amount-col { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 260px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #374151; }
    .total-row.grand { border-top: 2px solid #071a35; padding-top: 12px; margin-top: 6px; font-size: 16px; font-weight: 800; color: #071a35; }
    .notes-section { margin-top: 40px; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .notes-section label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; display: block; margin-bottom: 6px; }
    .notes-section p { font-size: 13px; color: #374151; }
    .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print {
      body { margin: 0; }
      .page { border: none; border-radius: 0; margin: 0; padding: 36px; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <h1>NAYAB LABS</h1>
        <p>Nayab Labs - Business Solutions</p>
        <p style="margin-top:2px;">hello@nayablabs.com</p>
      </div>
      <div class="invoice-meta">
        <div class="inv-label">Invoice</div>
        <div class="inv-num">${inv.invoice_number}</div>
        <div class="status-badge">${inv.status}</div>
      </div>
    </div>

    <hr class="divider" />

    <div class="info-grid">
      <div class="info-block">
        <label>Billed To</label>
        <p>${inv.client_name}</p>
      </div>
      <div class="info-block" style="text-align:right">
        <label>Issue Date</label>
        <p>${issueDate}</p>
        <br/>
        <label>Due Date</label>
        <p>${dueDate}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="amount-col">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${inv.notes || "Services rendered"}</td>
          <td class="amount-col">₹${Number(inv.amount).toLocaleString("en-IN")}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>₹${Number(inv.amount).toLocaleString("en-IN")}</span></div>
        <div class="total-row grand"><span>Total</span><span>₹${Number(inv.amount).toLocaleString("en-IN")}</span></div>
      </div>
    </div>

    ${inv.notes ? `<div class="notes-section"><label>Notes</label><p>${inv.notes}</p></div>` : ""}

    <div class="footer">
      <p>Thank you for your business! - Nayab Labs - nayablabs.com</p>
    </div>

    <div class="no-print" style="text-align:center;margin-top:32px;">
      <button onclick="window.print()" style="padding:10px 28px;background:#071a35;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => URL.revokeObjectURL(url));
    }
  }

  if (loading) return <LoadingState />;

  const filtered = invoices.filter(inv => {
    const matchStatus = !filterStatus || inv.status === filterStatus;
    const matchSearch = !search ||
      inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === "Sent" || i.status === "Draft").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Billing & Payments</h1>
          <p className="text-gray-400 mt-1">Manage invoices, track payments</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2.5 rounded-xl transition text-sm"
        >
          + Create Invoice
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Revenue stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-5">
          <p className="text-green-400/70 text-xs uppercase tracking-widest mb-2">Total Collected</p>
          <p className="text-3xl font-bold text-green-400">₹{totalPaid.toLocaleString()}</p>
          <p className="text-green-400/50 text-xs mt-1">{invoices.filter(i => i.status === "Paid").length} invoices paid</p>
        </div>
        <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-5">
          <p className="text-yellow-400/70 text-xs uppercase tracking-widest mb-2">Pending</p>
          <p className="text-3xl font-bold text-yellow-400">₹{totalPending.toLocaleString()}</p>
          <p className="text-yellow-400/50 text-xs mt-1">{invoices.filter(i => i.status === "Sent" || i.status === "Draft").length} invoices pending</p>
        </div>
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-5">
          <p className="text-red-400/70 text-xs uppercase tracking-widest mb-2">Overdue</p>
          <p className="text-3xl font-bold text-red-400">₹{totalOverdue.toLocaleString()}</p>
          <p className="text-red-400/50 text-xs mt-1">{invoices.filter(i => i.status === "Overdue").length} invoices overdue</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by client or invoice number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white/4 border border-white/8 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 text-sm"
        />
        <FormSelect
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          placeholder="All Statuses"
          options={INVOICE_STATUSES.map(s => ({ value: s, label: s }))}
        />
      </div>

      {/* Invoices */}
      {filtered.length === 0 ? (
        <EmptyState icon="🧾" title="No invoices found" description="Create your first invoice to start tracking payments" />
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <div
              key={inv.id}
              className="bg-white/4 border border-white/8 hover:border-white/12 rounded-xl p-4 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Invoice info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{inv.client_name}</span>
                    <span className="text-gray-500 text-xs">·</span>
                    <span className="text-gray-400 text-xs font-mono">{inv.invoice_number}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                    {inv.notes && <span className="truncate max-w-xs">· {inv.notes}</span>}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right sm:text-center sm:w-28">
                  <p className="text-white font-bold text-lg">₹{inv.amount.toLocaleString()}</p>
                </div>

                {/* Status */}
                <div className="sm:w-24">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[inv.status] || STATUS_COLORS.Draft}`}>
                    {inv.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:w-auto">
                  {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                    <button
                      onClick={() => markAsPaid(inv.id)}
                      className="text-xs px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded-lg hover:bg-green-500/25 transition font-medium"
                    >
                      Mark Paid
                    </button>
                  )}
                  <button
                    onClick={() => printInvoice(inv)}
                    className="text-xs px-3 py-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/25 rounded-lg hover:bg-purple-500/25 transition font-medium flex items-center gap-1"
                    title="Download / Print Invoice"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Invoice
                  </button>
                  {inv.status === "Draft" && (
                    <button
                      onClick={() => updateStatus(inv.id, "Sent")}
                      className="text-xs px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-lg hover:bg-blue-500/25 transition font-medium"
                    >
                      Send
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(inv)}
                    className="text-xs px-3 py-1.5 bg-white/8 text-gray-300 rounded-lg hover:bg-white/12 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Invoice" : "Create Invoice"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Client *"
            value={formData.client_id}
            onChange={e => setFormData({ ...formData, client_id: e.target.value })}
            options={clients.map(c => ({ value: c.id, label: c.client_name }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Invoice Number *"
              type="text"
              value={formData.invoice_number}
              onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
              required
              placeholder="INV-001"
            />
            <FormInput
              label="Amount (₹) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ""}
              onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
            />
          </div>

          <FormInput
            label="Due Date *"
            type="date"
            value={formData.due_date}
            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
            required
          />

          <FormSelect
            label="Status"
            value={formData.status || "Draft"}
            onChange={e => setFormData({ ...formData, status: e.target.value as Invoice["status"] })}
            options={INVOICE_STATUSES.map(s => ({ value: s, label: s }))}
          />

          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Service details, payment terms, etc."
            rows={3}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/40 text-black font-bold py-2.5 rounded-xl transition text-sm"
            >
              {submitting ? "Saving..." : editingId ? "Update Invoice" : "Create Invoice"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 bg-white/8 hover:bg-white/12 text-white font-medium py-2.5 rounded-xl transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
