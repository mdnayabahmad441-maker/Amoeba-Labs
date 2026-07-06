"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import {
  Client,
  Invoice,
  InvoiceItem,
  Payment,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
} from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";

type InvoiceDraftItem = {
  id?: string;
  service_name: string;
  description: string;
  quantity: number;
  rate: number;
};

type InvoiceForm = {
  client_id: string;
  invoice_number: string;
  due_date: string;
  status: Invoice["status"];
  notes: string;
  items: InvoiceDraftItem[];
};

type PaymentForm = {
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: Payment["method"];
  reference: string;
  notes: string;
};

type InvoiceWithBusinessData = Invoice & {
  client_name: string;
  client_email?: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  total: number;
  paid: number;
  balance: number;
  computedStatus: Invoice["status"];
};

const STATUS_COLORS: Record<Invoice["status"], string> = {
  Paid: "bg-green-500/15 text-green-400 border-green-500/20",
  "Partially Paid": "bg-blue-500/15 text-blue-300 border-blue-500/20",
  Sent: "bg-amber-300/15 text-amber-200 border-amber-300/20",
  Draft: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Overdue: "bg-red-500/15 text-red-400 border-red-500/20",
  Cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};

const today = () => new Date().toISOString().split("T")[0];

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function itemAmount(item: InvoiceDraftItem) {
  return Number(item.quantity || 0) * Number(item.rate || 0);
}

function computeStatus(invoice: Invoice, total: number, paid: number): Invoice["status"] {
  if (invoice.status === "Cancelled" || invoice.status === "Draft") return invoice.status;
  if (total > 0 && paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  if (invoice.due_date < today()) return "Overdue";
  return invoice.status === "Overdue" ? "Sent" : invoice.status;
}

function billingErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: unknown }).message || "");
    if (message.includes("invoice_items") || message.includes("payments")) {
      return `${message}. Run BILLING_UPGRADE.sql in Supabase SQL Editor, then refresh this page.`;
    }
    return message || "Unable to load billing data.";
  }

  return "Unable to load billing data. Run BILLING_UPGRADE.sql in Supabase SQL Editor, then refresh this page.";
}

function emptyInvoiceForm(clients: Client[], invoices: InvoiceWithBusinessData[]): InvoiceForm {
  const nums = invoices
    .map((i) => parseInt(i.invoice_number.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

  const due = new Date();
  due.setDate(due.getDate() + 15);

  return {
    client_id: clients[0]?.id ?? "",
    invoice_number: `INV-${String(next).padStart(4, "0")}`,
    due_date: due.toISOString().split("T")[0],
    status: "Draft",
    notes: "",
    items: [{ service_name: "", description: "", quantity: 1, rate: 0 }],
  };
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceWithBusinessData[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState("");

  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    client_id: "",
    invoice_number: "",
    due_date: "",
    status: "Draft",
    notes: "",
    items: [{ service_name: "", description: "", quantity: 1, rate: 0 }],
  });

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    invoice_id: "",
    amount: 0,
    payment_date: today(),
    method: "UPI",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const { data: ventures, error: ventureError } = await supabase
        .from("ventures")
        .select("id")
        .eq("status", "Active")
        .limit(1);

      if (ventureError) throw ventureError;
      if (!ventures?.length) {
        setError("No active venture found.");
        return;
      }

      const activeVentureId = ventures[0].id as string;
      setVentureId(activeVentureId);

      const [clientsRes, invoicesRes] = await Promise.all([
        supabase.from("clients").select("*").eq("venture_id", activeVentureId).order("client_name"),
        supabase.from("invoices").select("*").eq("venture_id", activeVentureId).order("created_at", { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const clientList = (clientsRes.data as Client[]) || [];
      const invoiceList = (invoicesRes.data as Invoice[]) || [];
      const invoiceIds = invoiceList.map((invoice) => invoice.id);

      let items: InvoiceItem[] = [];
      let payments: Payment[] = [];

      if (invoiceIds.length > 0) {
        const [itemsRes, paymentsRes] = await Promise.all([
          supabase.from("invoice_items").select("*").in("invoice_id", invoiceIds),
          supabase.from("payments").select("*").in("invoice_id", invoiceIds).order("payment_date", { ascending: false }),
        ]);

        if (itemsRes.error) throw itemsRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        items = (itemsRes.data as InvoiceItem[]) || [];
        payments = (paymentsRes.data as Payment[]) || [];
      }

      const clientMap = new Map(clientList.map((client) => [client.id, client]));
      const itemMap = new Map<string, InvoiceItem[]>();
      const paymentMap = new Map<string, Payment[]>();

      items.forEach((item) => {
        itemMap.set(item.invoice_id, [...(itemMap.get(item.invoice_id) || []), item]);
      });
      payments.forEach((payment) => {
        paymentMap.set(payment.invoice_id, [...(paymentMap.get(payment.invoice_id) || []), payment]);
      });

      setClients(clientList);
      setInvoices(
        invoiceList.map((invoice) => {
          const invoiceItems = itemMap.get(invoice.id) || [];
          const invoicePayments = paymentMap.get(invoice.id) || [];
          const total = invoiceItems.length
            ? invoiceItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
            : Number(invoice.amount || 0);
          const paid = invoicePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          const client = clientMap.get(invoice.client_id);

          return {
            ...invoice,
            client_name: client?.client_name || "Unknown Client",
            client_email: client?.email,
            items: invoiceItems,
            payments: invoicePayments,
            total,
            paid,
            balance: Math.max(total - paid, 0),
            computedStatus: computeStatus(invoice, total, paid),
          };
        })
      );
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchStatus = !filterStatus || invoice.computedStatus === filterStatus;
      const term = search.trim().toLowerCase();
      const matchSearch =
        !term ||
        invoice.client_name.toLowerCase().includes(term) ||
        invoice.invoice_number.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [filterStatus, invoices, search]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (summary, invoice) => ({
        invoiced: summary.invoiced + invoice.total,
        collected: summary.collected + invoice.paid,
        outstanding: summary.outstanding + invoice.balance,
        overdue:
          summary.overdue +
          (invoice.computedStatus === "Overdue" ? invoice.balance : 0),
      }),
      { invoiced: 0, collected: 0, outstanding: 0, overdue: 0 }
    );
  }, [invoices]);

  const formTotal = invoiceForm.items.reduce((sum, item) => sum + itemAmount(item), 0);

  function openAddModal() {
    setInvoiceForm(emptyInvoiceForm(clients, invoices));
    setEditingId(null);
    setShowInvoiceModal(true);
  }

  function openEditModal(invoice: InvoiceWithBusinessData) {
    setInvoiceForm({
      client_id: invoice.client_id,
      invoice_number: invoice.invoice_number,
      due_date: invoice.due_date,
      status: invoice.status,
      notes: invoice.notes || "",
      items: invoice.items.length
        ? invoice.items.map((item) => ({
            id: item.id,
            service_name: item.service_name,
            description: item.description || "",
            quantity: Number(item.quantity || 1),
            rate: Number(item.rate || 0),
          }))
        : [{ service_name: invoice.notes || "Services rendered", description: "", quantity: 1, rate: invoice.amount }],
    });
    setEditingId(invoice.id);
    setShowInvoiceModal(true);
  }

  function openPaymentModal(invoice: InvoiceWithBusinessData) {
    setPaymentForm({
      invoice_id: invoice.id,
      amount: invoice.balance,
      payment_date: today(),
      method: "UPI",
      reference: "",
      notes: "",
    });
    setShowPaymentModal(true);
  }

  function updateItem(index: number, patch: Partial<InvoiceDraftItem>) {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  }

  function addItem() {
    setInvoiceForm((current) => ({
      ...current,
      items: [...current.items, { service_name: "", description: "", quantity: 1, rate: 0 }],
    }));
  }

  function removeItem(index: number) {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function syncInvoiceStatus(invoiceId: string) {
    const refreshed = invoices.find((invoice) => invoice.id === invoiceId);
    if (!refreshed) return;

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoiceId);
    const paid = ((paymentsData || []) as Pick<Payment, "amount">[]).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
    const status = computeStatus(refreshed, refreshed.total, paid);

    // Some existing databases have a status check constraint created before
    // "Partially Paid" existed. The UI can compute partial status from payments,
    // so only persist statuses older databases are expected to accept.
    if (status === "Partially Paid") return;

    const { error: statusError } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId);

    if (statusError) throw statusError;
  }

  async function handleInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceForm.client_id) {
      setError("Please select a client.");
      return;
    }
    if (!ventureId) {
      setError("No active venture found. Refresh the page.");
      return;
    }
    if (formTotal <= 0) {
      setError("Add at least one billable item with an amount.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        client_id: invoiceForm.client_id,
        invoice_number: invoiceForm.invoice_number,
        due_date: invoiceForm.due_date,
        status: invoiceForm.status,
        notes: invoiceForm.notes || null,
        amount: formTotal,
      };

      let invoiceId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase.from("invoices").update(payload).eq("id", editingId);
        if (updateError) throw updateError;
        await supabase.from("invoice_items").delete().eq("invoice_id", editingId);
      } else {
        const { data, error: insertError } = await supabase
          .from("invoices")
          .insert([{ ...payload, venture_id: ventureId }])
          .select("id")
          .single();
        if (insertError) throw insertError;
        invoiceId = data.id as string;
      }

      const cleanItems = invoiceForm.items
        .filter((item) => item.service_name.trim() || itemAmount(item) > 0)
        .map((item) => ({
          invoice_id: invoiceId,
          service_name: item.service_name.trim() || "Service",
          description: item.description.trim() || null,
          quantity: Number(item.quantity || 1),
          rate: Number(item.rate || 0),
          amount: itemAmount(item),
        }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(cleanItems);
      if (itemsError) throw itemsError;

      setShowInvoiceModal(false);
      await loadData();
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.invoice_id || paymentForm.amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: paymentError } = await supabase.from("payments").insert([
        {
          invoice_id: paymentForm.invoice_id,
          amount: paymentForm.amount,
          payment_date: paymentForm.payment_date,
          method: paymentForm.method,
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
        },
      ]);
      if (paymentError) throw paymentError;

      await syncInvoiceStatus(paymentForm.invoice_id);
      setShowPaymentModal(false);
      await loadData();
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: Invoice["status"]) {
    try {
      const { error: statusError } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (statusError) throw statusError;
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update invoice status.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice and its billing records?")) return;

    try {
      const { error: deleteError } = await supabase.from("invoices").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete invoice.");
    }
  }

  async function logoDataUrl() {
    try {
      const response = await fetch("/groenics-logo.jpeg");
      const blob = await response.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  }

  async function downloadInvoice(invoice: InvoiceWithBusinessData) {
    const logo = await logoDataUrl();
    const issueDate = new Date(invoice.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const dueDate = new Date(invoice.due_date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const billItems = (invoice.items.length
      ? invoice.items
      : [{ service_name: "Services rendered", description: invoice.notes, quantity: 1, rate: invoice.amount, amount: invoice.amount }]
    );
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    let y = margin;

    const addPageIfNeeded = (neededHeight: number) => {
      if (y + neededHeight <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    const rightText = (text: string, x: number, lineY: number) => {
      doc.text(text, x, lineY, { align: "right" });
    };

    if (logo) {
      try {
        doc.addImage(logo, "JPEG", margin, y, 48, 48);
      } catch {
        // Logo is optional. If the image fails to decode, still generate the bill.
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39);
    doc.text("GROENICS", margin + 62, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Business problem solving with AI, automation, and software.", margin + 62, y + 36);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    rightText("Invoice", pageWidth - margin, y + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39);
    rightText(invoice.invoice_number, pageWidth - margin, y + 34);
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    rightText(invoice.computedStatus, pageWidth - margin, y + 52);

    y += 86;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 28;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("BILLED TO", margin, y);
    const issueDateX = pageWidth - margin - 150;
    const dueDateX = pageWidth - margin;

    doc.text("ISSUE DATE", issueDateX, y, { align: "right" });
    doc.text("DUE DATE", dueDateX, y, { align: "right" });

    y += 17;
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(invoice.client_name, margin, y);
    doc.text(issueDate, issueDateX, y, { align: "right" });
    doc.text(dueDate, dueDateX, y, { align: "right" });
    if (invoice.client_email) {
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(invoice.client_email, margin, y);
    }

    y += 36;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("SERVICES", margin, y);
    y += 14;

    const tableX = margin;
    const colNo = tableX;
    const colDescription = tableX + 32;
    const colQty = pageWidth - margin - 205;
    const colRate = pageWidth - margin - 125;
    const colAmount = pageWidth - margin;

    doc.setFillColor(249, 250, 251);
    doc.rect(tableX, y, pageWidth - margin * 2, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("#", colNo + 6, y + 15);
    doc.text("DESCRIPTION", colDescription, y + 15);
    doc.text("QTY", colQty, y + 15, { align: "right" });
    doc.text("RATE", colRate, y + 15, { align: "right" });
    doc.text("AMOUNT", colAmount, y + 15, { align: "right" });
    y += 32;

    billItems.forEach((item, index) => {
      const descriptionLines = item.description
        ? doc.splitTextToSize(String(item.description), 250)
        : [];
      const rowHeight = Math.max(32, 18 + descriptionLines.length * 11);
      addPageIfNeeded(rowHeight + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text(String(index + 1), colNo + 6, y);
      doc.setFont("helvetica", "bold");
      doc.text(item.service_name, colDescription, y);

      if (descriptionLines.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(descriptionLines, colDescription, y + 12);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text(Number(item.quantity).toLocaleString("en-IN"), colQty, y, { align: "right" });
      doc.text(money(Number(item.rate)), colRate, y, { align: "right" });
      doc.text(money(Number(item.amount)), colAmount, y, { align: "right" });
      y += rowHeight;
      doc.setDrawColor(243, 244, 246);
      doc.line(tableX, y, pageWidth - margin, y);
      y += 12;
    });

    addPageIfNeeded(110);
    const totalsX = pageWidth - margin - 220;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text("Invoice total", totalsX, y);
    doc.text(money(invoice.total), pageWidth - margin, y, { align: "right" });
    y += 20;
    doc.text("Paid", totalsX, y);
    doc.text(money(invoice.paid), pageWidth - margin, y, { align: "right" });
    y += 14;
    doc.setDrawColor(17, 24, 39);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text("Balance due", totalsX, y);
    doc.text(money(invoice.balance), pageWidth - margin, y, { align: "right" });

    if (invoice.payments.length) {
      y += 34;
      addPageIfNeeded(24 + invoice.payments.length * 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("PAYMENTS RECEIVED", margin, y);
      y += 18;

      invoice.payments.forEach((payment) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        doc.text(`${new Date(payment.payment_date).toLocaleDateString("en-IN")} - ${payment.method}`, margin, y);
        doc.setFont("helvetica", "bold");
        doc.text(money(payment.amount), pageWidth - margin, y, { align: "right" });
        y += 18;
      });
    }

    if (invoice.notes) {
      y += 16;
      const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - margin * 2);
      addPageIfNeeded(34 + noteLines.length * 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text("NOTES", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(noteLines, margin, y);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Thank you for your business.", pageWidth / 2, pageHeight - 28, { align: "center" });

    const fileClient = invoice.client_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`${invoice.invoice_number}-${fileClient}-bill.pdf`);
  }

  async function downloadReceipt(invoice: InvoiceWithBusinessData) {
    const logo = await logoDataUrl();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 42;
    let y = margin;

    if (logo) {
      try {
        doc.addImage(logo, "JPEG", margin, y, 46, 46);
      } catch {
        // Receipt still works without the logo.
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39);
    doc.text("GROENICS", margin + 60, y + 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Payment receipt", margin + 60, y + 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Receipt", pageWidth - margin, y + 10, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text(`${invoice.invoice_number}-R`, pageWidth - margin, y + 34, { align: "right" });

    y += 86;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 32;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Received from", margin, y);
    doc.text("Invoice number", pageWidth - margin - 150, y, { align: "right" });
    doc.text("Receipt date", pageWidth - margin, y, { align: "right" });
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(invoice.client_name, margin, y);
    doc.text(invoice.invoice_number, pageWidth - margin - 150, y, { align: "right" });
    doc.text(new Date().toLocaleDateString("en-IN"), pageWidth - margin, y, { align: "right" });

    y += 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payments received", margin, y);
    y += 20;

    invoice.payments.forEach((payment) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(`${new Date(payment.payment_date).toLocaleDateString("en-IN")} - ${payment.method}`, margin, y);
      if (payment.reference) {
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Reference: ${payment.reference}`, margin, y + 12);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(money(payment.amount), pageWidth - margin, y, { align: "right" });
      y += payment.reference ? 34 : 22;
    });

    y += 18;
    doc.setDrawColor(17, 24, 39);
    doc.line(pageWidth - margin - 220, y, pageWidth - margin, y);
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total received", pageWidth - margin - 220, y);
    doc.text(money(invoice.paid), pageWidth - margin, y, { align: "right" });
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Balance due", pageWidth - margin - 220, y);
    doc.text(money(invoice.balance), pageWidth - margin, y, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Thank you for your payment.", pageWidth / 2, 814, { align: "center" });

    const fileClient = invoice.client_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`${invoice.invoice_number}-${fileClient}-receipt.pdf`);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Billing & Payments</h1>
          <p className="mt-1 text-gray-400">Invoices, line items, payments, balances, and overdue tracking</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 sm:w-auto"
        >
          + Create Invoice
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Total Invoiced", value: totals.invoiced, color: "text-white", border: "border-white/10" },
          { label: "Collected", value: totals.collected, color: "text-green-400", border: "border-green-500/20" },
          { label: "Outstanding", value: totals.outstanding, color: "text-yellow-400", border: "border-yellow-500/20" },
          { label: "Overdue", value: totals.overdue, color: "text-red-400", border: "border-red-500/20" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border ${stat.border} bg-black/20 p-5`}>
            <p className="mb-2 text-xs uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{money(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by client or invoice number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-amber-300/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-300/50 focus:outline-none"
        />
        <FormSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="All Statuses"
          options={INVOICE_STATUSES.map((status) => ({ value: status, label: status }))}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="Invoice" title="No invoices found" description="Create your first invoice to start tracking real payments" />
      ) : (
        <div className="space-y-3">
          {filtered.map((invoice) => (
            <div key={invoice.id} className="rounded-xl border border-amber-300/10 bg-black/20 p-4 transition hover:border-white/12">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{invoice.client_name}</span>
                    <span className="text-xs text-gray-500">-</span>
                    <span className="font-mono text-xs text-gray-400">{invoice.invoice_number}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[invoice.computedStatus]}`}>
                      {invoice.computedStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
                    <span>{invoice.items.length || 1} line item{(invoice.items.length || 1) > 1 ? "s" : ""}</span>
                    <span>{invoice.payments.length} payment{invoice.payments.length === 1 ? "" : "s"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-right sm:min-w-[320px]">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gray-600">Total</p>
                    <p className="font-bold text-white">{money(invoice.total)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gray-600">Paid</p>
                    <p className="font-bold text-green-400">{money(invoice.paid)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gray-600">Balance</p>
                    <p className="font-bold text-amber-200">{money(invoice.balance)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {invoice.computedStatus !== "Paid" && invoice.computedStatus !== "Cancelled" && (
                    <button
                      onClick={() => openPaymentModal(invoice)}
                      className="rounded-lg border border-green-500/25 bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/25"
                    >
                      Record Payment
                    </button>
                  )}
                  {invoice.status === "Draft" && (
                    <button
                      onClick={() => updateStatus(invoice.id, "Sent")}
                      className="rounded-lg border border-amber-300/25 bg-amber-300/15 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-300/20"
                    >
                      Send
                    </button>
                  )}
                  <button
                    onClick={() => downloadInvoice(invoice)}
                    className="rounded-lg border border-stone-300/20 bg-stone-300/10 px-3 py-1.5 text-xs font-medium text-stone-300 transition hover:bg-stone-300/15"
                  >
                    Download Bill
                  </button>
                  {invoice.payments.length > 0 && (
                    <button
                      onClick={() => downloadReceipt(invoice)}
                      className="rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition hover:bg-green-500/20"
                    >
                      Receipt
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(invoice)}
                    className="rounded-lg bg-white/8 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/12"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title={editingId ? "Edit Invoice" : "Create Invoice"}
      >
        <form onSubmit={handleInvoiceSubmit} className="space-y-4">
          <FormSelect
            label="Client *"
            value={invoiceForm.client_id}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })}
            options={clients.map((client) => ({ value: client.id, label: client.client_name }))}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Invoice Number *"
              type="text"
              value={invoiceForm.invoice_number}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
              required
            />
            <FormInput
              label="Due Date *"
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
              required
            />
          </div>

          <FormSelect
            label="Status"
            value={invoiceForm.status}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as Invoice["status"] })}
            options={INVOICE_STATUSES.map((status) => ({ value: status, label: status }))}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Invoice Items</p>
              <button type="button" onClick={addItem} className="text-xs font-semibold text-amber-200 hover:text-amber-100">
                + Add Item
              </button>
            </div>

            {invoiceForm.items.map((item, index) => (
              <div key={index} className="rounded-xl border border-amber-300/10 bg-black/20 p-3">
                <div className="grid grid-cols-1 gap-3">
                  <FormInput
                    label="Service"
                    value={item.service_name}
                    onChange={(e) => updateItem(index, { service_name: e.target.value })}
                    placeholder="AI automation setup"
                  />
                  <FormTextarea
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    rows={2}
                    placeholder="What was delivered?"
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <FormInput
                    label="Qty"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <FormInput
                    label="Rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(index, { rate: parseFloat(e.target.value) || 0 })}
                  />
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-gray-500">
                      Amount
                    </label>
                    <div className="rounded-xl border border-amber-300/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white">
                      {money(itemAmount(item))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="mt-3 text-xs text-red-300 hover:text-red-200"
                >
                  Remove item
                </button>
              </div>
            ))}
          </div>

          <FormTextarea
            label="Invoice Notes"
            value={invoiceForm.notes}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
            placeholder="Payment terms, bank details, delivery notes..."
            rows={3}
          />

          <div className="rounded-xl border border-amber-300/10 bg-amber-300/5 p-4 text-right">
            <p className="text-xs uppercase tracking-widest text-amber-200/60">Invoice Total</p>
            <p className="text-2xl font-bold text-amber-200">{money(formTotal)}</p>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-amber-300 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200 disabled:bg-amber-300/40"
            >
              {submitting ? "Saving..." : editingId ? "Update Invoice" : "Create Invoice"}
            </button>
            <button
              type="button"
              onClick={() => setShowInvoiceModal(false)}
              className="flex-1 rounded-xl bg-white/8 py-2.5 text-sm font-medium text-white transition hover:bg-white/12"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <FormInput
            label="Amount Received *"
            type="number"
            min="0"
            step="0.01"
            value={paymentForm.amount || ""}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Payment Date *"
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              required
            />
            <FormSelect
              label="Method"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment["method"] })}
              options={PAYMENT_METHODS.map((method) => ({ value: method, label: method }))}
            />
          </div>
          <FormInput
            label="Reference"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
            placeholder="UPI ref, bank UTR, receipt no."
          />
          <FormTextarea
            label="Notes"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            rows={3}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-green-400 py-2.5 text-sm font-bold text-black transition hover:bg-green-300 disabled:bg-green-400/40"
          >
            {submitting ? "Saving..." : "Save Payment"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
