"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lead, Proposal } from "@/lib/types";
import Modal from "./Modal";
import { FormInput, FormSelect, FormTextarea } from "./FormInputs";
import { EmptyState, LoadingState } from "./States";

type DuplicateClient = {
  client_id: string;
  client_name: string;
  phone: string | null;
  email: string | null;
  match_reasons: string[];
};

interface Props {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConverted: () => void;
}

function localDateTime(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function LeadConversionWizard({ lead, isOpen, onClose, onConverted }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateClient[]>([]);
  const [form, setForm] = useState({
    proposal_id: "",
    existing_client_id: "",
    agreement_status: "Not required",
    deposit_required: false,
    deposit_amount: Number(lead.expected_project_value || 0) * 0.3,
    create_project: true,
    create_invoice: true,
    invoice_number: "",
    invoice_due_date: "",
    schedule_onboarding: true,
    onboarding_at: "",
    create_initial_task: true,
    conversion_note: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setStep(1);
      const now = Date.now();
      setForm((current) => ({
        ...current,
        invoice_due_date: new Date(now + 15 * 86_400_000).toISOString().slice(0, 10),
        onboarding_at: localDateTime(new Date(now + 24 * 60 * 60 * 1000)),
      }));
      Promise.all([
        supabase.from("proposals").select("*").eq("lead_id", lead.id).is("archived_at", null).in("status", ["Sent", "Accepted"]).order("created_at", { ascending: false }),
        supabase.rpc("find_lead_conversion_duplicates", { target_lead: lead.id }),
        supabase.from("business_settings").select("invoice_prefix").eq("venture_id", lead.venture_id).maybeSingle(),
      ]).then(([proposalResult, duplicateResult, settingsResult]) => {
        if (!active) return;
        if (proposalResult.error) setError(proposalResult.error.message);
        else {
          const rows = (proposalResult.data || []) as Proposal[];
          setProposals(rows);
          setForm((current) => ({ ...current, proposal_id: rows[0]?.id || "" }));
        }
        if (duplicateResult.error) setError("Apply the Phase 9 migration before using conversion.");
        else setDuplicates((duplicateResult.data || []) as DuplicateClient[]);
        const prefix = settingsResult.data?.invoice_prefix || "INV";
        setForm((current) => ({ ...current, invoice_number: `${prefix}-${Date.now().toString().slice(-8)}` }));
        setLoading(false);
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isOpen, lead.id, lead.venture_id]);

  async function convert() {
    if (!form.proposal_id) { setError("An accepted or sent proposal linked to this lead is required."); return; }
    if (form.deposit_required && form.deposit_amount <= 0) { setError("Enter a deposit amount greater than zero."); return; }
    setSubmitting(true);
    setError("");
    try {
      const { error: conversionError } = await supabase.rpc("convert_won_lead", {
        target_lead: lead.id,
        accepted_proposal: form.proposal_id,
        existing_client: form.existing_client_id || null,
        agreement_state: form.agreement_status,
        requires_deposit: form.deposit_required,
        required_deposit_amount: form.deposit_required ? form.deposit_amount : 0,
        should_create_project: form.create_project,
        should_create_invoice: form.create_invoice,
        invoice_number_value: form.create_invoice ? form.invoice_number : null,
        invoice_due_date: form.create_invoice ? form.invoice_due_date : null,
        should_schedule_onboarding: form.schedule_onboarding,
        onboarding_at: form.schedule_onboarding ? new Date(form.onboarding_at).toISOString() : null,
        should_create_initial_task: form.create_initial_task,
        conversion_note: form.conversion_note.trim() || null,
      });
      if (conversionError) throw conversionError;
      onConverted();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to convert this lead.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProposal = proposals.find((proposal) => proposal.id === form.proposal_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Convert won opportunity · Step ${step} of 4`}>
      {loading ? <LoadingState /> : (
        <div className="space-y-5">
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          <div className="grid grid-cols-4 gap-2">
            {["Confirm", "Client", "Setup", "Review"].map((label, index) => <div key={label} className={`rounded-lg px-2 py-2 text-center text-xs ${step === index + 1 ? "bg-amber-300 font-bold text-black" : step > index + 1 ? "bg-green-500/15 text-green-300" : "bg-white/5 text-gray-500"}`}>{label}</div>)}
          </div>

          {step === 1 && (
            <section className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="font-semibold text-white">{lead.client_name}</p>
                <p className="text-gray-400">{lead.contact_person || "No contact person"} · {lead.phone || "No phone"} · {lead.email || "No email"}</p>
                <p className="mt-2 text-gray-400">{lead.main_business_problem || "No problem statement recorded."}</p>
              </div>
              {proposals.length ? <FormSelect label="Accepted proposal" required value={form.proposal_id} onChange={(event) => setForm({ ...form, proposal_id: event.target.value })} options={proposals.map((proposal) => ({ value: proposal.id, label: `${proposal.proposal_number} · ${proposal.title} · Rs. ${Number(proposal.subtotal).toLocaleString("en-IN")}` }))} /> : <EmptyState icon="Proposal" title="No eligible proposal" description="Create and send a proposal linked to this lead before conversion." />}
              <p className="text-xs text-gray-500">The selected proposal will be marked Accepted only when the final conversion succeeds.</p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">Potential duplicate clients</h3>
                <p className="text-xs text-gray-500">Matches use normalized phone, email, and organization name.</p>
              </div>
              <label className="block rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-white">
                <input type="radio" className="mr-2 accent-amber-300" checked={!form.existing_client_id} onChange={() => setForm({ ...form, existing_client_id: "" })} />
                Create a new client from this lead
              </label>
              {duplicates.map((client) => (
                <label key={client.client_id} className="block rounded-xl border border-white/10 p-3 text-sm text-gray-300">
                  <input type="radio" className="mr-2 accent-amber-300" checked={form.existing_client_id === client.client_id} onChange={() => setForm({ ...form, existing_client_id: client.client_id })} />
                  <span className="font-semibold text-white">{client.client_name}</span> · {client.phone || client.email || "No contact"} <span className="text-amber-200">({client.match_reasons.join(", ")})</span>
                </label>
              ))}
              {!duplicates.length && <p className="rounded-xl bg-green-500/10 p-3 text-sm text-green-300">No potential duplicate client was found.</p>}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect label="Agreement status" value={form.agreement_status} onChange={(event) => setForm({ ...form, agreement_status: event.target.value })} options={["Not required","Pending","Accepted"].map((value) => ({ value, label: value }))} />
                <label className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={form.deposit_required} onChange={(event) => setForm({ ...form, deposit_required: event.target.checked })} className="accent-amber-300" />Deposit required</label>
                {form.deposit_required && <FormInput label="Deposit amount" type="number" min="1" value={form.deposit_amount} onChange={(event) => setForm({ ...form, deposit_amount: Number(event.target.value) })} />}
              </div>
              <div className="space-y-3 rounded-xl border border-white/10 p-4">
                <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={form.create_project} onChange={(event) => setForm({ ...form, create_project: event.target.checked })} className="accent-amber-300" />Create gated project</label>
                <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={form.create_invoice} onChange={(event) => setForm({ ...form, create_invoice: event.target.checked })} className="accent-amber-300" />Create invoice draft for review</label>
                {form.create_invoice && <div className="grid gap-3 sm:grid-cols-2"><FormInput label="Invoice number" required value={form.invoice_number} onChange={(event) => setForm({ ...form, invoice_number: event.target.value })} /><FormInput label="Due date" type="date" required value={form.invoice_due_date} onChange={(event) => setForm({ ...form, invoice_due_date: event.target.value })} /></div>}
                <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={form.schedule_onboarding} onChange={(event) => setForm({ ...form, schedule_onboarding: event.target.checked })} className="accent-amber-300" />Schedule onboarding meeting</label>
                {form.schedule_onboarding && <FormInput label="Onboarding date and time" type="datetime-local" required value={form.onboarding_at} onChange={(event) => setForm({ ...form, onboarding_at: event.target.value })} />}
                <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={form.create_initial_task} onChange={(event) => setForm({ ...form, create_initial_task: event.target.checked })} className="accent-amber-300" />Create initial onboarding task</label>
              </div>
              <FormTextarea label="Conversion notes" rows={3} value={form.conversion_note} onChange={(event) => setForm({ ...form, conversion_note: event.target.value })} />
            </section>
          )}

          {step === 4 && (
            <section className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-gray-300">
              <h3 className="font-semibold text-green-300">Ready for one atomic conversion</h3>
              <p>Proposal: {selectedProposal?.proposal_number} · {selectedProposal?.title}</p>
              <p>Client: {form.existing_client_id ? duplicates.find((item) => item.client_id === form.existing_client_id)?.client_name : `Create ${lead.client_name}`}</p>
              <p>Agreement: {form.agreement_status} · Deposit: {form.deposit_required ? `Rs. ${form.deposit_amount.toLocaleString("en-IN")}` : "Not required"}</p>
              <p>Outputs: {[form.create_project && "project", form.create_invoice && "invoice draft", form.schedule_onboarding && "onboarding meeting", form.create_initial_task && "initial task"].filter(Boolean).join(", ") || "client only"}</p>
              <p className="text-xs text-gray-500">Nothing is externally sent. If any database step fails, the complete conversion is rolled back.</p>
            </section>
          )}

          <div className="flex gap-3">
            {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 rounded-lg bg-white/10 py-2.5 text-white">Back</button>}
            {step < 4 ? <button type="button" disabled={step === 1 && !form.proposal_id} onClick={() => setStep(step + 1)} className="flex-1 rounded-lg bg-amber-300 py-2.5 font-bold text-black disabled:opacity-40">Continue</button> : <button type="button" disabled={submitting} onClick={convert} className="flex-1 rounded-lg bg-green-500 py-2.5 font-bold text-black disabled:opacity-40">{submitting ? "Converting..." : "Confirm conversion"}</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
