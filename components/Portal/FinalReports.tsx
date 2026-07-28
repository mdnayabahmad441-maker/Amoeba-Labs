"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EmptyState, ErrorState, LoadingState } from "./States";
import { FormInput, FormSelect } from "./FormInputs";

type ReportKey =
  | "pipeline"
  | "collections"
  | "profitability"
  | "expenses"
  | "field-visits"
  | "recurring"
  | "weekly"
  | "sources"
  | "win-loss";
type VentureRow = { id: string; venture_name: string; is_default: boolean };
type ClientRow = { id: string; venture_id: string; client_name: string };
type ProjectRow = { id: string; venture_id: string; project_name: string };
type LeadRow = {
  id: string; venture_id: string; client_name: string; pipeline_stage: string;
  lead_temperature: string; source: string | null; expected_project_value: number | null;
  probability_of_closing: number | null; lost_reason: string | null; created_at: string; updated_at: string;
};
type InvoiceRow = { id: string; venture_id: string; client_id: string; project_id: string | null; invoice_number: string; amount: number; status: string; due_date: string; created_at: string };
type PaymentRow = { invoice_id: string; amount: number; payment_date: string };
type ExpenseRow = { id: string; venture_id: string; project_id: string | null; expense_date: string; category: string; amount: number; vendor: string | null };
type ProfitRow = { project_id: string; venture_id: string; project_name: string; client_id: string | null; profitability_basis: string; profitability_revenue: number; direct_costs: number; gross_profit: number; gross_margin: number | null; profitability_health: string };
type VisitRow = { id: string; venture_id: string; related_client_id: string | null; business_name: string; town: string; status: string; appointment_at: string; distance_km: number; travel_expense: number; estimated_opportunity_value: number; decision_maker_met: boolean; demonstration_delivered: boolean; proposal_required: boolean };
type RecurringRow = { id: string; venture_id: string; client_id: string; product_service: string; plan: string | null; billing_frequency: string; amount: number; tax_rate: number; next_billing_date: string; renewal_date: string | null; status: string; payment_status: string };
type CsvRow = Record<string, string | number | boolean | null | undefined>;

const reports: Array<{ key: ReportKey; label: string }> = [
  { key: "pipeline", label: "Sales Pipeline" },
  { key: "collections", label: "Collections & Outstanding" },
  { key: "profitability", label: "Project Profitability" },
  { key: "expenses", label: "Expenses" },
  { key: "field-visits", label: "Field Visits" },
  { key: "recurring", label: "Recurring Revenue" },
  { key: "weekly", label: "Weekly CEO Report" },
  { key: "sources", label: "Lead Sources" },
  { key: "win-loss", label: "Win/Loss Analysis" },
];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const monthStart = () => `${today().slice(0, 7)}-01`;
const number = (value: unknown) => Number(value || 0);
const dateInRange = (value: string | null | undefined, from: string, to: string) =>
  Boolean(value && value.slice(0, 10) >= from && value.slice(0, 10) <= to);

function downloadCsv(name: string, rows: CsvRow[]) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}-${today()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Table({ rows }: { rows: CsvRow[] }) {
  if (!rows.length) return <EmptyState icon="R" title="No matching records" description="Adjust the filters or add operational data." />;
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-white/5 text-gray-500"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap p-3 uppercase tracking-wider">{column.replaceAll("_", " ")}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={String(row.id || index)} className="border-t border-white/8 text-gray-300">{columns.map((column) => <td key={column} className="whitespace-nowrap p-3">{String(row[column] ?? "—")}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Cards({ values }: { values: Array<{ label: string; value: string; detail?: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{values.map((item) => <div key={item.label} className="rounded-xl border border-amber-300/10 bg-black/25 p-4"><p className="text-xs uppercase tracking-wider text-gray-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-white">{item.value}</p>{item.detail && <p className="mt-1 text-xs text-gray-500">{item.detail}</p>}</div>)}</div>;
}

export default function FinalReports() {
  const [active, setActive] = useState<ReportKey>("pipeline");
  const [ventures, setVentures] = useState<VentureRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [profits, setProfits] = useState<ProfitRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [recurring, setRecurring] = useState<RecurringRow[]>([]);
  const [ventureId, setVentureId] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setWarnings([]);
    try {
      const ventureResult = await supabase.from("ventures").select("id,venture_name,is_default").is("archived_at", null).order("is_default", { ascending: false }).order("venture_name");
      if (ventureResult.error) throw ventureResult.error;
      const ventureRows = (ventureResult.data || []) as VentureRow[];
      if (!ventureRows.length) throw new Error("No accessible business units. Run the RLS membership verification SQL.");
      setVentures(ventureRows);
      const ids = ventureRows.map((venture) => venture.id);
      setVentureId((current) => current || ventureRows.find((venture) => venture.is_default)?.id || ids[0]);

      const results = await Promise.all([
        supabase.from("clients").select("id,venture_id,client_name").in("venture_id", ids).is("archived_at", null).order("client_name"),
        supabase.from("projects").select("id,venture_id,project_name").in("venture_id", ids).is("archived_at", null).order("project_name"),
        supabase.from("leads").select("id,venture_id,client_name,pipeline_stage,lead_temperature,source,expected_project_value,probability_of_closing,lost_reason,created_at,updated_at").in("venture_id", ids).is("archived_at", null),
        supabase.from("invoices").select("id,venture_id,client_id,project_id,invoice_number,amount,status,due_date,created_at").in("venture_id", ids).is("archived_at", null),
        supabase.from("expenses").select("id,venture_id,project_id,expense_date,category,amount,vendor").in("venture_id", ids).is("archived_at", null),
        supabase.from("project_profitability").select("*").in("venture_id", ids),
        supabase.from("field_visits").select("id,venture_id,related_client_id,business_name,town,status,appointment_at,distance_km,travel_expense,estimated_opportunity_value,decision_maker_met,demonstration_delivered,proposal_required").in("venture_id", ids).is("archived_at", null),
        supabase.from("recurring_services").select("id,venture_id,client_id,product_service,plan,billing_frequency,amount,tax_rate,next_billing_date,renewal_date,status,payment_status").in("venture_id", ids).is("archived_at", null),
        supabase.from("business_settings").select("venture_id,currency_code").in("venture_id", ids),
      ]);
      const [clientResult, projectResult, leadResult, invoiceResult, expenseResult, profitResult, visitResult, recurringResult, settingsResult] = results;
      const required = [clientResult, projectResult, leadResult, invoiceResult, expenseResult];
      const failed = required.find((result) => result.error);
      if (failed?.error) throw failed.error;
      setClients((clientResult.data || []) as ClientRow[]);
      setProjects((projectResult.data || []) as ProjectRow[]);
      setLeads((leadResult.data || []) as LeadRow[]);
      setInvoices((invoiceResult.data || []) as InvoiceRow[]);
      setExpenses((expenseResult.data || []) as ExpenseRow[]);
      setProfits(profitResult.error ? [] : (profitResult.data || []) as ProfitRow[]);
      setVisits(visitResult.error ? [] : (visitResult.data || []) as VisitRow[]);
      setRecurring(recurringResult.error ? [] : (recurringResult.data || []) as RecurringRow[]);
      const missing = [
        profitResult.error && "Project profitability migration is not applied.",
        visitResult.error && "Field-visits migration is not applied.",
        recurringResult.error && "Recurring-billing migration is not applied.",
        settingsResult.error && "Business-settings cleanup migration is not applied.",
      ].filter(Boolean) as string[];
      setWarnings(missing);
      const defaultId = ventureRows.find((venture) => venture.is_default)?.id || ids[0];
      const setting = (settingsResult.data || []).find((row) => row.venture_id === defaultId);
      setCurrency(setting?.currency_code || "INR");

      const invoiceIds = (invoiceResult.data || []).map((invoice) => invoice.id);
      if (invoiceIds.length) {
        const paymentResult = await supabase.from("payments").select("invoice_id,amount,payment_date").in("invoice_id", invoiceIds);
        if (paymentResult.error) throw paymentResult.error;
        setPayments((paymentResult.data || []) as PaymentRow[]);
      } else setPayments([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load reports.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const money = useCallback((value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value), [currency]);
  const allowedVenture = useCallback((id: string) => !ventureId || id === ventureId, [ventureId]);
  const filteredClients = clients.filter((client) => allowedVenture(client.venture_id));
  const filteredProjects = projects.filter((project) => allowedVenture(project.venture_id) && (!clientId || profits.some((profit) => profit.project_id === project.id && profit.client_id === clientId)));
  const clientName = useCallback((id: string | null) => clients.find((client) => client.id === id)?.client_name || "Unlinked", [clients]);
  const projectName = useCallback((id: string | null) => projects.find((project) => project.id === id)?.project_name || "Unlinked", [projects]);

  const report = useMemo(() => {
    const scopeLeads = leads.filter((lead) => allowedVenture(lead.venture_id) && dateInRange(lead.created_at, from, to));
    const scopeInvoices = invoices.filter((invoice) => allowedVenture(invoice.venture_id) && (!clientId || invoice.client_id === clientId) && (!projectId || invoice.project_id === projectId));
    const scopeExpenses = expenses.filter((expense) => allowedVenture(expense.venture_id) && (!projectId || expense.project_id === projectId) && dateInRange(expense.expense_date, from, to));
    const scopeProfits = profits.filter((profit) => allowedVenture(profit.venture_id) && (!clientId || profit.client_id === clientId) && (!projectId || profit.project_id === projectId));
    const scopeVisits = visits.filter((visit) => allowedVenture(visit.venture_id) && (!clientId || visit.related_client_id === clientId) && dateInRange(visit.appointment_at, from, to));
    const scopeRecurring = recurring.filter((service) => allowedVenture(service.venture_id) && (!clientId || service.client_id === clientId));
    const paid = new Map<string, number>();
    payments.filter((payment) => dateInRange(payment.payment_date, from, to)).forEach((payment) => paid.set(payment.invoice_id, (paid.get(payment.invoice_id) || 0) + number(payment.amount)));

    if (active === "pipeline") {
      const rows = scopeLeads.filter((lead) => !["Won", "Lost"].includes(lead.pipeline_stage)).map((lead) => ({ id: lead.id, opportunity: lead.client_name, stage: lead.pipeline_stage, temperature: lead.lead_temperature, value: number(lead.expected_project_value), probability: `${number(lead.probability_of_closing)}%`, weighted_value: Math.round(number(lead.expected_project_value) * number(lead.probability_of_closing) / 100), source: lead.source || "Unknown" }));
      return { rows, cards: [{ label: "Open opportunities", value: String(rows.length) }, { label: "Pipeline value", value: money(rows.reduce((sum, row) => sum + number(row.value), 0)) }, { label: "Weighted pipeline", value: money(rows.reduce((sum, row) => sum + number(row.weighted_value), 0)) }] };
    }
    if (active === "collections") {
      const rows = scopeInvoices.filter((invoice) => invoice.status !== "Cancelled").map((invoice) => { const received = paid.get(invoice.id) || 0; return { id: invoice.id, invoice: invoice.invoice_number, client: clientName(invoice.client_id), project: projectName(invoice.project_id), status: invoice.status, due_date: invoice.due_date, invoiced: number(invoice.amount), collected_in_period: received, outstanding: Math.max(number(invoice.amount) - payments.filter((payment) => payment.invoice_id === invoice.id).reduce((sum, payment) => sum + number(payment.amount), 0), 0) }; });
      return { rows, cards: [{ label: "Amount invoiced", value: money(rows.reduce((sum, row) => sum + number(row.invoiced), 0)) }, { label: "Collected in period", value: money(rows.reduce((sum, row) => sum + number(row.collected_in_period), 0)) }, { label: "Outstanding", value: money(rows.reduce((sum, row) => sum + number(row.outstanding), 0)) }, { label: "Overdue", value: money(rows.filter((row) => row.due_date < today()).reduce((sum, row) => sum + number(row.outstanding), 0)) }] };
    }
    if (active === "profitability") {
      const rows = scopeProfits.map((profit) => ({ id: profit.project_id, project: profit.project_name, client: clientName(profit.client_id), basis: profit.profitability_basis, revenue: number(profit.profitability_revenue), direct_costs: number(profit.direct_costs), gross_profit: number(profit.gross_profit), margin: profit.gross_margin === null ? "—" : `${profit.gross_margin}%`, health: profit.profitability_health }));
      return { rows, cards: [{ label: "Projects", value: String(rows.length) }, { label: "Revenue basis total", value: money(rows.reduce((sum, row) => sum + number(row.revenue), 0)) }, { label: "Direct costs", value: money(rows.reduce((sum, row) => sum + number(row.direct_costs), 0)) }, { label: "Gross profit", value: money(rows.reduce((sum, row) => sum + number(row.gross_profit), 0)) }] };
    }
    if (active === "expenses") {
      const rows = scopeExpenses.map((expense) => ({ id: expense.id, date: expense.expense_date, category: expense.category, vendor: expense.vendor || "—", project: projectName(expense.project_id), amount: number(expense.amount) }));
      return { rows, cards: [{ label: "Expenses", value: money(rows.reduce((sum, row) => sum + number(row.amount), 0)) }, { label: "Entries", value: String(rows.length) }, { label: "Project-linked", value: money(scopeExpenses.filter((expense) => expense.project_id).reduce((sum, expense) => sum + number(expense.amount), 0)) }] };
    }
    if (active === "field-visits") {
      const rows = scopeVisits.map((visit) => ({ id: visit.id, date: visit.appointment_at.slice(0, 10), business: visit.business_name, town: visit.town, status: visit.status, distance_km: number(visit.distance_km), travel_expense: number(visit.travel_expense), opportunity_value: number(visit.estimated_opportunity_value), decision_maker_met: visit.decision_maker_met, demo_delivered: visit.demonstration_delivered, proposal_required: visit.proposal_required }));
      return { rows, cards: [{ label: "Visits", value: String(rows.length) }, { label: "Completed", value: String(rows.filter((row) => row.status === "Completed").length) }, { label: "Pipeline generated", value: money(rows.reduce((sum, row) => sum + number(row.opportunity_value), 0)) }, { label: "Travel expense", value: money(rows.reduce((sum, row) => sum + number(row.travel_expense), 0)) }] };
    }
    if (active === "recurring") {
      const rows = scopeRecurring.map((service) => ({ id: service.id, client: clientName(service.client_id), service: service.product_service, plan: service.plan || "—", frequency: service.billing_frequency, amount: number(service.amount), tax_rate: `${number(service.tax_rate)}%`, next_billing: service.next_billing_date, renewal: service.renewal_date || "—", status: service.status, payment: service.payment_status }));
      const activeServices = scopeRecurring.filter((service) => service.status === "Active");
      const monthlyFactors: Record<string, number> = { Monthly: 1, Quarterly: 1 / 3, "Half-yearly": 1 / 6, Annually: 1 / 12 };
      const monthly = activeServices.reduce((sum, service) => sum + number(service.amount) * (monthlyFactors[service.billing_frequency] || 0), 0);
      return { rows, cards: [{ label: "Active services", value: String(activeServices.length) }, { label: "MRR", value: money(monthly) }, { label: "ARR", value: money(monthly * 12) }, { label: "Renewals in 30 days", value: String(activeServices.filter((service) => service.renewal_date && service.renewal_date <= localAddDays(30)).length) }] };
    }
    if (active === "sources") {
      const grouped = new Map<string, LeadRow[]>();
      scopeLeads.forEach((lead) => { const key = lead.source || "Unknown"; grouped.set(key, [...(grouped.get(key) || []), lead]); });
      const rows = [...grouped.entries()].map(([source, items]) => ({ id: source, source, leads: items.length, won: items.filter((lead) => lead.pipeline_stage === "Won").length, pipeline_value: items.reduce((sum, lead) => sum + number(lead.expected_project_value), 0), win_rate: `${items.length ? Math.round(items.filter((lead) => lead.pipeline_stage === "Won").length / items.length * 100) : 0}%` }));
      return { rows, cards: [{ label: "Sources", value: String(rows.length) }, { label: "Leads", value: String(scopeLeads.length) }, { label: "Attributed value", value: money(rows.reduce((sum, row) => sum + number(row.pipeline_value), 0)) }] };
    }
    if (active === "win-loss") {
      const closed = scopeLeads.filter((lead) => ["Won", "Lost"].includes(lead.pipeline_stage));
      const reasons = new Map<string, number>();
      closed.filter((lead) => lead.pipeline_stage === "Lost").forEach((lead) => { const reason = lead.lost_reason || "Reason not recorded"; reasons.set(reason, (reasons.get(reason) || 0) + 1); });
      const rows = [...reasons.entries()].map(([reason, count]) => ({ id: reason, loss_reason: reason, deals: count }));
      const won = closed.filter((lead) => lead.pipeline_stage === "Won");
      return { rows, cards: [{ label: "Deals won", value: String(won.length) }, { label: "Deals lost", value: String(closed.length - won.length) }, { label: "Win rate", value: `${closed.length ? Math.round(won.length / closed.length * 100) : 0}%` }, { label: "Won value", value: money(won.reduce((sum, lead) => sum + number(lead.expected_project_value), 0)) }] };
    }
    return { rows: [] as CsvRow[], cards: [] as Array<{ label: string; value: string }> };
  }, [active, allowedVenture, clientId, clientName, expenses, from, invoices, leads, money, payments, profits, projectId, projectName, recurring, to, visits]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/70">Decision-ready reporting</p>
        <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Reports</h1>
        <p className="mt-1 text-sm text-gray-400">Nine focused reports for sales, cash, delivery, visits, and recurring revenue.</p>
      </header>
      {warnings.length > 0 && <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 text-sm text-orange-200">{warnings.join(" ")}</div>}
      <div className="flex gap-2 overflow-x-auto pb-2">{reports.map((item) => <button key={item.key} onClick={() => setActive(item.key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${active === item.key ? "bg-amber-300 text-black" : "bg-white/8 text-gray-300"}`}>{item.label}</button>)}</div>
      <div className="grid gap-3 rounded-xl border border-white/8 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <FormSelect label="Business unit" value={ventureId} onChange={(event) => { setVentureId(event.target.value); setClientId(""); setProjectId(""); const settingVenture = event.target.value || ventures.find((venture) => venture.is_default)?.id; if (settingVenture) supabase.from("business_settings").select("currency_code").eq("venture_id", settingVenture).maybeSingle().then(({ data }) => setCurrency(data?.currency_code || "INR")); }} placeholder="All accessible" options={ventures.map((venture) => ({ value: venture.id, label: venture.venture_name }))} />
        <FormSelect label="Client" value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="All clients" options={filteredClients.map((client) => ({ value: client.id, label: client.client_name }))} />
        <FormSelect label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="All projects" options={filteredProjects.map((project) => ({ value: project.id, label: project.project_name }))} />
        <FormInput label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <FormInput label="To" type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      {active === "weekly" ? (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-8 text-center"><h2 className="text-xl font-bold text-white">Weekly CEO Report</h2><p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">Open the dedicated weekly view for bottlenecks, immediate leads, financial actions, delivery risks, and next week priorities.</p><Link href="/portal/reports/weekly" className="mt-5 inline-block rounded-xl bg-amber-300 px-5 py-3 font-bold text-black">Open Weekly CEO Report</Link></div>
      ) : (
        <><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-xl font-bold text-white">{reports.find((item) => item.key === active)?.label}</h2><button onClick={() => downloadCsv(active, report.rows)} disabled={!report.rows.length} className="rounded-lg border border-green-500/25 px-4 py-2 text-xs font-semibold text-green-300 disabled:opacity-40">Export CSV</button></div><Cards values={report.cards} /><Table rows={report.rows} /></>
      )}
    </div>
  );
}

function localAddDays(days: number) {
  const value = new Date(`${today()}T00:00:00+05:30`);
  value.setDate(value.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(value);
}
