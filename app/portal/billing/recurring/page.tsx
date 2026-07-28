"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Client, Venture } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { EmptyState, LoadingState } from "@/components/Portal/States";

type Frequency = "Monthly" | "Quarterly" | "Half-yearly" | "Annually" | "Custom";
type Status = "Draft" | "Active" | "Paused" | "Cancelled" | "Expired";
type Service = { id: string; venture_id: string; client_id: string; product_service: string; plan_name: string | null; billing_frequency: Frequency; custom_interval_days: number | null; amount: number; tax_rate: number; start_date: string; next_billing_date: string; renewal_date: string | null; status: Status; auto_create_invoice_draft: boolean; notes: string | null; client_name?: string };
const empty = { client_id: "", product_service: "", plan_name: "", billing_frequency: "Monthly" as Frequency, custom_interval_days: 30, amount: 0, tax_rate: 0, start_date: "", next_billing_date: "", renewal_date: "", status: "Draft" as Status, auto_create_invoice_draft: false, notes: "" };
const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

export default function RecurringBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [venture, setVenture] = useState<Venture | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data: ventures, error: ventureError } = await supabase.from("ventures").select("*").eq("status", "Active").is("archived_at", null).order("is_default", { ascending: false }).order("created_at", { ascending: true }).limit(1);
      if (ventureError) throw ventureError;
      if (!ventures?.length) throw new Error("No active venture found.");
      const active = ventures[0] as Venture; setVenture(active);
      const [clientResult, serviceResult] = await Promise.all([
        supabase.from("clients").select("*").eq("venture_id", active.id).is("archived_at", null).order("client_name"),
        supabase.from("recurring_services").select("*").eq("venture_id", active.id).is("archived_at", null).order("next_billing_date"),
      ]);
      if (clientResult.error) throw clientResult.error;
      if (serviceResult.error) throw new Error("Apply the Phase 13 recurring billing migration first.");
      const clientRows = (clientResult.data || []) as Client[]; setClients(clientRows);
      const names = new Map(clientRows.map((client) => [client.id, client.client_name]));
      setServices(((serviceResult.data || []) as Service[]).map((service) => ({ ...service, client_name: names.get(service.client_id) })));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load recurring billing."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const metrics = useMemo(() => {
    const active = services.filter((service) => service.status === "Active");
    const monthly = (service: Service) => service.billing_frequency === "Monthly" ? Number(service.amount) : service.billing_frequency === "Quarterly" ? Number(service.amount) / 3 : service.billing_frequency === "Half-yearly" ? Number(service.amount) / 6 : service.billing_frequency === "Annually" ? Number(service.amount) / 12 : Number(service.amount) * 30 / Number(service.custom_interval_days || 30);
    const mrr = active.reduce((sum, service) => sum + monthly(service), 0);
    const limit = new Date(); limit.setDate(limit.getDate() + 30); const limitDate = limit.toISOString().slice(0, 10);
    return { mrr, arr: mrr * 12, renewals: active.filter((service) => service.renewal_date && service.renewal_date <= limitDate).length };
  }, [services]);

  function openAdd() {
    const date = new Date().toISOString().slice(0, 10);
    setForm({ ...empty, client_id: clients[0]?.id || "", start_date: date, next_billing_date: date });
    setEditingId(null); setShowModal(true);
  }
  function openEdit(service: Service) { setForm({ client_id: service.client_id, product_service: service.product_service, plan_name: service.plan_name || "", billing_frequency: service.billing_frequency, custom_interval_days: service.custom_interval_days || 30, amount: Number(service.amount), tax_rate: Number(service.tax_rate), start_date: service.start_date, next_billing_date: service.next_billing_date, renewal_date: service.renewal_date || "", status: service.status, auto_create_invoice_draft: service.auto_create_invoice_draft, notes: service.notes || "" }); setEditingId(service.id); setShowModal(true); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!venture) return; setSaving(true); setError("");
    const payload = { ...form, venture_id: venture.id, plan_name: form.plan_name || null, renewal_date: form.renewal_date || null, custom_interval_days: form.billing_frequency === "Custom" ? form.custom_interval_days : null, notes: form.notes || null, updated_at: new Date().toISOString() };
    const result = editingId ? await supabase.from("recurring_services").update(payload).eq("id", editingId) : await supabase.from("recurring_services").insert([payload]);
    setSaving(false); if (result.error) { setError(result.error.message); return; } setShowModal(false); await load();
  }
  async function createDraft(service: Service) {
    const invoiceNumber = `INV-R-${service.next_billing_date.replaceAll("-", "")}-${service.id.slice(0, 6).toUpperCase()}`;
    const due = new Date(`${service.next_billing_date}T00:00:00`); due.setDate(due.getDate() + 15);
    const { error: draftError } = await supabase.rpc("create_recurring_invoice_draft", { target_service: service.id, invoice_number_value: invoiceNumber, due_date_value: due.toISOString().slice(0, 10) });
    if (draftError) { setError(draftError.message); return; } await load();
  }
  async function archive(service: Service) { if (!confirm("Archive this recurring service? Existing invoices remain unchanged.")) return; await supabase.from("recurring_services").update({ archived_at: new Date().toISOString(), status: "Cancelled" }).eq("id", service.id); await load(); }

  if (loading) return <LoadingState />;
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/portal/billing" className="text-xs text-amber-300">← Billing</Link><h1 className="mt-2 text-3xl font-bold text-white">Recurring Billing</h1><p className="text-sm text-gray-400">Review subscriptions, retainers, hosting, maintenance, and renewals.</p></div><button onClick={openAdd} className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-black">+ Recurring service</button></header>
    {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-3">{[["Monthly recurring revenue",money(metrics.mrr)],["Annual recurring revenue",money(metrics.arr)],["Renewals due in 30 days",String(metrics.renewals)]].map(([label,value]) => <article key={label} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></article>)}</div>
    {services.length ? <div className="grid gap-4 lg:grid-cols-2">{services.map((service) => <article key={service.id} className="rounded-xl border border-amber-300/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-amber-300/70">{service.client_name}</p><h2 className="font-bold text-white">{service.product_service}</h2><p className="text-xs text-gray-500">{service.plan_name || "No plan"} · {service.billing_frequency}</p></div><span className="rounded-full bg-white/8 px-2 py-1 text-xs text-gray-300">{service.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="text-gray-500">Amount</p><p className="font-semibold text-white">{money(service.amount)} + {service.tax_rate}% tax</p></div><div><p className="text-gray-500">Next billing</p><p className="font-semibold text-white">{new Date(service.next_billing_date).toLocaleDateString("en-IN")}</p></div><div><p className="text-gray-500">Renewal</p><p className="text-white">{service.renewal_date ? new Date(service.renewal_date).toLocaleDateString("en-IN") : "Not set"}</p></div><div><p className="text-gray-500">Draft setting</p><p className="text-white">{service.auto_create_invoice_draft ? "Eligible for reviewed draft" : "Manual"}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{service.status === "Active" && <button onClick={() => createDraft(service)} className="rounded bg-green-500/15 px-3 py-2 text-xs text-green-300">Create invoice draft</button>}<button onClick={() => openEdit(service)} className="rounded bg-white/10 px-3 py-2 text-xs text-white">Edit</button><button onClick={() => archive(service)} className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-300">Archive</button></div></article>)}</div> : <EmptyState icon="R" title="No recurring services" description="Add subscriptions, retainers, hosting, maintenance, or recurring software services." />}
    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit recurring service" : "Add recurring service"}><form onSubmit={save} className="space-y-4"><FormSelect label="Client" required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={clients.map((client) => ({ value: client.id, label: client.client_name }))} /><div className="grid gap-4 sm:grid-cols-2"><FormInput label="Product or service" required value={form.product_service} onChange={(e) => setForm({ ...form, product_service: e.target.value })} /><FormInput label="Plan" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} /><FormSelect label="Frequency" value={form.billing_frequency} onChange={(e) => setForm({ ...form, billing_frequency: e.target.value as Frequency })} options={["Monthly","Quarterly","Half-yearly","Annually","Custom"].map((value) => ({ value, label: value }))} />{form.billing_frequency === "Custom" && <FormInput label="Interval days" type="number" min="1" value={form.custom_interval_days} onChange={(e) => setForm({ ...form, custom_interval_days: Number(e.target.value) })} />}<FormInput label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /><FormInput label="Tax %" type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /><FormInput label="Start date" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /><FormInput label="Next billing date" type="date" required value={form.next_billing_date} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} /><FormInput label="Renewal date" type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /><FormSelect label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} options={["Draft","Active","Paused","Cancelled","Expired"].map((value) => ({ value, label: value }))} /></div><label className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={form.auto_create_invoice_draft} onChange={(e) => setForm({ ...form, auto_create_invoice_draft: e.target.checked })} className="accent-amber-300" />Allow invoice draft creation after review; never send automatically</label><FormTextarea label="Notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /><button disabled={saving} className="w-full rounded-lg bg-amber-300 py-2.5 font-bold text-black">{saving ? "Saving..." : "Save recurring service"}</button></form></Modal>
  </div>;
}
