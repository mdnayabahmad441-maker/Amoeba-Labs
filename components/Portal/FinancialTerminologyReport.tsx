"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FormInput, FormSelect, FormTextarea } from "./FormInputs";

type VentureRow = { id: string; venture_name: string; status: string };
type ClientRow = { id: string; client_name: string };
type ProjectRow = { id: string; project_name: string; client_id: string | null };
type InvoiceRow = { id: string; client_id: string; project_id: string | null; amount: number; status: string; created_at: string; due_date: string };
type PaymentRow = { invoice_id: string; amount: number; payment_date: string };
type ExpenseRow = { amount: number; expense_date: string; project_id: string | null };
type RecognitionRow = { amount: number; project_id: string; recognition_date: string };
type AdjustmentRow = { amount: number; adjustment_type: "Founder withdrawal" | "Tax reserve"; adjustment_date: string };

const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function periodBounds(period: string, anchor: string, customFrom: string, customTo: string) {
  if (period === "custom") return { from: customFrom, to: customTo };
  const date = new Date(`${anchor}T00:00:00`);
  let from: Date;
  let to: Date;
  if (period === "previous") {
    from = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    to = new Date(date.getFullYear(), date.getMonth(), 0);
  } else if (period === "quarter") {
    const startMonth = Math.floor(date.getMonth() / 3) * 3;
    from = new Date(date.getFullYear(), startMonth, 1);
    to = new Date(date.getFullYear(), startMonth + 3, 0);
  } else if (period === "financial_year") {
    const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    from = new Date(year, 3, 1);
    to = new Date(year + 1, 2, 31);
  } else {
    from = new Date(date.getFullYear(), date.getMonth(), 1);
    to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  const local = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return { from: local(from), to: local(to) };
}

export default function FinancialTerminologyReport() {
  const [today, setToday] = useState("");
  const [ventures, setVentures] = useState<VentureRow[]>([]);
  const [ventureId, setVentureId] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [metrics, setMetrics] = useState({ invoiced: 0, collected: 0, recognized: 0, outstanding: 0, overdue: 0, operating: 0, direct: 0, grossProfit: 0, operatingProfit: 0, withdrawals: 0, taxReserve: 0, availableCash: 0 });
  const [error, setError] = useState("");
  const [entry, setEntry] = useState({ type: "Recognized revenue", project_id: "", date: "", amount: 0, notes: "" });

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const date = new Date();
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      setToday(value); setCustomFrom(`${value.slice(0, 7)}-01`); setCustomTo(value); setEntry((current) => ({ ...current, date: value }));
      const { data } = await supabase.from("ventures").select("id, venture_name, status").is("archived_at", null).order("venture_name");
      const rows = (data || []) as VentureRow[];
      setVentures(rows);
      setVentureId(rows.find((item) => item.status === "Active")?.id || rows[0]?.id || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const load = useCallback(async () => {
    if (!ventureId || !today) return;
    setError("");
    const bounds = periodBounds(period, today, customFrom, customTo);
    try {
      const [clientResult, projectResult, invoiceResult, expenseResult, recognitionResult, adjustmentResult] = await Promise.all([
        supabase.from("clients").select("id, client_name").eq("venture_id", ventureId).is("archived_at", null).order("client_name"),
        supabase.from("projects").select("id, project_name, client_id").eq("venture_id", ventureId).is("archived_at", null).order("project_name"),
        supabase.from("invoices").select("id, client_id, project_id, amount, status, created_at, due_date").eq("venture_id", ventureId).is("archived_at", null),
        supabase.from("expenses").select("amount, expense_date, project_id").eq("venture_id", ventureId).is("archived_at", null).gte("expense_date", bounds.from).lte("expense_date", bounds.to),
        supabase.from("project_revenue_recognitions").select("amount, project_id, recognition_date").eq("venture_id", ventureId).gte("recognition_date", bounds.from).lte("recognition_date", bounds.to),
        supabase.from("financial_cash_adjustments").select("amount, adjustment_type, adjustment_date").eq("venture_id", ventureId).gte("adjustment_date", bounds.from).lte("adjustment_date", bounds.to),
      ]);
      const required = [clientResult, projectResult, invoiceResult, expenseResult];
      const failed = required.find((result) => result.error);
      if (failed?.error) throw failed.error;
      setClients((clientResult.data || []) as ClientRow[]);
      const projectRows = (projectResult.data || []) as ProjectRow[];
      setProjects(projectRows);
      const eligibleProjects = new Set(projectRows.filter((project) => (!clientId || project.client_id === clientId) && (!projectId || project.id === projectId)).map((project) => project.id));
      const invoices = ((invoiceResult.data || []) as InvoiceRow[]).filter((invoice) => (!clientId || invoice.client_id === clientId) && (!projectId || invoice.project_id === projectId) && invoice.status !== "Cancelled");
      const invoiceIds = invoices.map((invoice) => invoice.id);
      const { data: paymentData, error: paymentError } = invoiceIds.length ? await supabase.from("payments").select("invoice_id, amount, payment_date").in("invoice_id", invoiceIds) : { data: [], error: null };
      if (paymentError) throw paymentError;
      const payments = ((paymentData || []) as PaymentRow[]).filter((payment) => payment.payment_date >= bounds.from && payment.payment_date <= bounds.to);
      const paidAll = new Map<string, number>();
      ((paymentData || []) as PaymentRow[]).forEach((payment) => paidAll.set(payment.invoice_id, (paidAll.get(payment.invoice_id) || 0) + Number(payment.amount)));
      const periodInvoices = invoices.filter((invoice) => invoice.created_at.slice(0, 10) >= bounds.from && invoice.created_at.slice(0, 10) <= bounds.to);
      const expenses = ((expenseResult.data || []) as ExpenseRow[]).filter((expense) => !projectId || expense.project_id === projectId);
      const recognitions = recognitionResult.error ? [] : ((recognitionResult.data || []) as RecognitionRow[]).filter((row) => eligibleProjects.has(row.project_id));
      const adjustments = adjustmentResult.error ? [] : (adjustmentResult.data || []) as AdjustmentRow[];
      const invoiced = periodInvoices.reduce((sum, row) => sum + Number(row.amount), 0);
      const collected = payments.reduce((sum, row) => sum + Number(row.amount), 0);
      const recognized = recognitions.reduce((sum, row) => sum + Number(row.amount), 0);
      const outstanding = invoices.reduce((sum, row) => sum + Math.max(Number(row.amount) - (paidAll.get(row.id) || 0), 0), 0);
      const overdue = invoices.filter((row) => row.due_date < today).reduce((sum, row) => sum + Math.max(Number(row.amount) - (paidAll.get(row.id) || 0), 0), 0);
      const direct = expenses.filter((row) => row.project_id && eligibleProjects.has(row.project_id)).reduce((sum, row) => sum + Number(row.amount), 0);
      const operating = expenses.filter((row) => !row.project_id).reduce((sum, row) => sum + Number(row.amount), 0);
      const withdrawals = adjustments.filter((row) => row.adjustment_type === "Founder withdrawal").reduce((sum, row) => sum + Number(row.amount), 0);
      const taxReserve = adjustments.filter((row) => row.adjustment_type === "Tax reserve").reduce((sum, row) => sum + Number(row.amount), 0);
      setMetrics({ invoiced, collected, recognized, outstanding, overdue, operating, direct, grossProfit: recognized - direct, operatingProfit: recognized - direct - operating, withdrawals, taxReserve, availableCash: collected - direct - operating - withdrawals - taxReserve });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load financial report."); }
  }, [clientId, customFrom, customTo, period, projectId, today, ventureId]);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  async function saveEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!ventureId || entry.amount <= 0) return;
    const result = entry.type === "Recognized revenue"
      ? await supabase.from("project_revenue_recognitions").insert([{ venture_id: ventureId, project_id: entry.project_id, recognition_date: entry.date, amount: entry.amount, notes: entry.notes || null }])
      : await supabase.from("financial_cash_adjustments").insert([{ venture_id: ventureId, adjustment_type: entry.type, adjustment_date: entry.date, amount: entry.amount, notes: entry.notes || null }]);
    if (result.error) { setError(result.error.message.includes("project_revenue") ? "Apply the Phase 12 migration first." : result.error.message); return; }
    setEntry({ ...entry, amount: 0, notes: "" }); await load();
  }

  const cards = [
    ["Amount invoiced", metrics.invoiced], ["Amount collected", metrics.collected], ["Recognized revenue", metrics.recognized],
    ["Outstanding receivables", metrics.outstanding], ["Overdue receivables", metrics.overdue], ["Operating expenses", metrics.operating],
    ["Direct project costs", metrics.direct], ["Gross profit", metrics.grossProfit], ["Estimated operating profit", metrics.operatingProfit],
    ["Founder withdrawal", metrics.withdrawals], ["Tax reserve", metrics.taxReserve], ["Available cash", metrics.availableCash],
  ] as const;

  return <section className="space-y-5 rounded-2xl border border-amber-300/15 bg-black/25 p-5">
    <div><h2 className="text-xl font-bold text-white">Financial position</h2><p className="mt-1 text-xs text-gray-500">Collections, revenue, costs, profit, reserves, and cash are calculated separately.</p></div>
    {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><FormSelect value={ventureId} onChange={(e) => { setVentureId(e.target.value); setClientId(""); setProjectId(""); }} options={ventures.map((item) => ({ value: item.id, label: item.venture_name }))} /><FormSelect value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }} placeholder="All clients" options={clients.map((item) => ({ value: item.id, label: item.client_name }))} /><FormSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="All projects" options={projects.filter((item) => !clientId || item.client_id === clientId).map((item) => ({ value: item.id, label: item.project_name }))} /><FormSelect value={period} onChange={(e) => setPeriod(e.target.value)} options={[["month","This month"],["previous","Previous month"],["quarter","This quarter"],["financial_year","Financial year"],["custom","Custom period"]].map(([value,label]) => ({ value, label }))} /></div>
    {period === "custom" && <div className="grid gap-3 sm:grid-cols-2"><FormInput label="From" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /><FormInput label="To" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value]) => <article key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-gray-500">{label}</p><p className={`mt-2 text-xl font-bold ${value < 0 ? "text-red-300" : "text-white"}`}>{money(value)}</p></article>)}</div>
    <details className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4"><summary className="cursor-pointer font-semibold text-sky-200">Record recognition, withdrawal, or tax reserve</summary><form onSubmit={saveEntry} className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><FormSelect label="Entry type" value={entry.type} onChange={(e) => setEntry({ ...entry, type: e.target.value })} options={["Recognized revenue","Founder withdrawal","Tax reserve"].map((value) => ({ value, label: value }))} />{entry.type === "Recognized revenue" && <FormSelect label="Project" required value={entry.project_id} onChange={(e) => setEntry({ ...entry, project_id: e.target.value })} placeholder="Select project" options={projects.map((item) => ({ value: item.id, label: item.project_name }))} />}<FormInput label="Date" type="date" required value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /><FormInput label="Amount" type="number" min="0.01" step="0.01" required value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: Number(e.target.value) })} /></div><FormTextarea label="Notes" rows={2} value={entry.notes} onChange={(e) => setEntry({ ...entry, notes: e.target.value })} /><button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-black">Record entry</button></form></details>
    <p className="text-xs leading-5 text-gray-600">Gross profit = recognized revenue − direct project costs. Estimated operating profit = gross profit − operating expenses. Available cash = collections − cash expenses − founder withdrawals − tax reserve. These operational figures are not statutory accounts.</p>
  </section>;
}
