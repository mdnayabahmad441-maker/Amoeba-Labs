"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Client, Lead, Proposal, ProposalItem, PROPOSAL_STATUSES, ProposalStatus } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";

type ProposalRow = Proposal & {
  items: ProposalItem[];
  client_name?: string;
  lead_name?: string;
};

type ProposalForm = {
  client_id: string;
  lead_id: string;
  proposal_number: string;
  title: string;
  status: ProposalStatus;
  issue_date: string;
  valid_until: string;
  notes: string;
  terms: string;
  items: Array<{
    service_name: string;
    description: string;
    quantity: number;
    rate: number;
  }>;
};

const today = () => new Date().toISOString().split("T")[0];
const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

function itemAmount(item: ProposalForm["items"][number]) {
  return Number(item.quantity || 0) * Number(item.rate || 0);
}

function emptyForm(prefix = "PROP"): ProposalForm {
  return {
    client_id: "",
    lead_id: "",
    proposal_number: `${prefix}-${Date.now().toString().slice(-6)}`,
    title: "",
    status: "Draft",
    issue_date: today(),
    valid_until: "",
    notes: "",
    terms: "",
    items: [{ service_name: "", description: "", quantity: 1, rate: 0 }],
  };
}

export default function ProposalsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ventureId, setVentureId] = useState("");
  const [proposalPrefix, setProposalPrefix] = useState("PROP");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [defaultTerms, setDefaultTerms] = useState("");
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [formData, setFormData] = useState<ProposalForm>(emptyForm());

  useEffect(() => {
    loadData();
  }, []);

  const formTotal = useMemo(
    () => formData.items.reduce((sum, item) => sum + itemAmount(item), 0),
    [formData.items]
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const { data: ventures } = await supabase
        .from("ventures")
        .select("id")
        .eq("status", "Active")
        .limit(1);

      if (!ventures || ventures.length === 0) {
        setError("No active venture found.");
        return;
      }

      const activeVentureId = ventures[0].id;
      setVentureId(activeVentureId);

      const [settingsRes, clientsRes, leadsRes, proposalsRes] = await Promise.all([
        supabase.from("business_settings").select("*").eq("venture_id", activeVentureId).maybeSingle(),
        supabase.from("clients").select("*").eq("venture_id", activeVentureId).order("client_name"),
        supabase.from("leads").select("*").eq("venture_id", activeVentureId).order("created_at", { ascending: false }),
        supabase.from("proposals").select("*").eq("venture_id", activeVentureId).order("created_at", { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (proposalsRes.error) throw proposalsRes.error;

      const settings = settingsRes.data as any;
      setProposalPrefix(settings?.proposal_prefix || "PROP");
      setInvoicePrefix(settings?.invoice_prefix || "INV");
      setDefaultTerms(settings?.default_payment_terms || "");

      const proposalRows = (proposalsRes.data || []) as Proposal[];
      const proposalIds = proposalRows.map((proposal) => proposal.id);
      const itemsRes = proposalIds.length
        ? await supabase.from("proposal_items").select("*").in("proposal_id", proposalIds)
        : { data: [], error: null };

      if (itemsRes.error) throw itemsRes.error;

      const clientRows = (clientsRes.data || []) as Client[];
      const leadRows = (leadsRes.data || []) as Lead[];
      const clientMap = new Map(clientRows.map((client) => [client.id, client.client_name]));
      const leadMap = new Map(leadRows.map((lead) => [lead.id, lead.client_name]));
      const itemMap = new Map<string, ProposalItem[]>();

      ((itemsRes.data || []) as ProposalItem[]).forEach((item) => {
        itemMap.set(item.proposal_id, [...(itemMap.get(item.proposal_id) || []), item]);
      });

      setClients(clientRows);
      setLeads(leadRows);
      setProposals(
        proposalRows.map((proposal) => ({
          ...proposal,
          items: itemMap.get(proposal.id) || [],
          client_name: proposal.client_id ? clientMap.get(proposal.client_id) : undefined,
          lead_name: proposal.lead_id ? leadMap.get(proposal.lead_id) : undefined,
        }))
      );
    } catch (err: any) {
      setError(err.message || "Unable to load proposals.");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setFormData({ ...emptyForm(proposalPrefix), terms: defaultTerms });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(proposal: ProposalRow) {
    setFormData({
      client_id: proposal.client_id || "",
      lead_id: proposal.lead_id || "",
      proposal_number: proposal.proposal_number,
      title: proposal.title,
      status: proposal.status,
      issue_date: proposal.issue_date,
      valid_until: proposal.valid_until || "",
      notes: proposal.notes || "",
      terms: proposal.terms || "",
      items:
        proposal.items.length > 0
          ? proposal.items.map((item) => ({
              service_name: item.service_name,
              description: item.description || "",
              quantity: Number(item.quantity),
              rate: Number(item.rate),
            }))
          : [{ service_name: "", description: "", quantity: 1, rate: 0 }],
    });
    setEditingId(proposal.id);
    setShowModal(true);
  }

  function updateItem(index: number, patch: Partial<ProposalForm["items"][number]>) {
    setFormData({
      ...formData,
      items: formData.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [...formData.items, { service_name: "", description: "", quantity: 1, rate: 0 }],
    });
  }

  function removeItem(index: number) {
    setFormData({
      ...formData,
      items: formData.items.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const cleanItems = formData.items
        .filter((item) => item.service_name.trim())
        .map((item) => ({
          service_name: item.service_name.trim(),
          description: item.description || null,
          quantity: Number(item.quantity || 1),
          rate: Number(item.rate || 0),
          amount: itemAmount(item),
        }));

      if (!cleanItems.length) throw new Error("Add at least one proposal item.");

      const proposalPayload = {
        venture_id: ventureId,
        client_id: formData.client_id || null,
        lead_id: formData.lead_id || null,
        proposal_number: formData.proposal_number,
        title: formData.title,
        status: formData.status,
        issue_date: formData.issue_date,
        valid_until: formData.valid_until || null,
        subtotal: formTotal,
        notes: formData.notes || null,
        terms: formData.terms || null,
        updated_at: new Date().toISOString(),
      };

      let proposalId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase.from("proposals").update(proposalPayload).eq("id", editingId);
        if (updateError) throw updateError;
        await supabase.from("proposal_items").delete().eq("proposal_id", editingId);
      } else {
        const { data, error: insertError } = await supabase
          .from("proposals")
          .insert([proposalPayload])
          .select()
          .single();
        if (insertError) throw insertError;
        proposalId = data.id;
      }

      const { error: itemsError } = await supabase
        .from("proposal_items")
        .insert(cleanItems.map((item) => ({ ...item, proposal_id: proposalId })));

      if (itemsError) throw itemsError;

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Unable to save proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setProposalStatus(proposal: ProposalRow, status: ProposalStatus) {
    const { error: statusError } = await supabase.from("proposals").update({ status }).eq("id", proposal.id);
    if (statusError) {
      setError(statusError.message);
      return;
    }

    if (proposal.lead_id && status === "Accepted") {
      await supabase.from("leads").update({ stage: "Closed Won" }).eq("id", proposal.lead_id);
    }

    loadData();
  }

  async function convertToInvoice(proposal: ProposalRow) {
    if (!proposal.client_id) {
      setError("Convert the lead into a client before creating an invoice.");
      return;
    }

    const invoiceNumber = `${invoicePrefix}-${Date.now().toString().slice(-6)}`;
    const due = new Date();
    due.setDate(due.getDate() + 15);

    const { data, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          venture_id: proposal.venture_id,
          client_id: proposal.client_id,
          amount: proposal.subtotal,
          invoice_number: invoiceNumber,
          due_date: due.toISOString().split("T")[0],
          status: "Draft",
          notes: `Created from proposal ${proposal.proposal_number}`,
        },
      ])
      .select()
      .single();

    if (invoiceError) {
      setError(invoiceError.message);
      return;
    }

    const { error: itemsError } = await supabase.from("invoice_items").insert(
      proposal.items.map((item) => ({
        invoice_id: data.id,
        service_name: item.service_name,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }))
    );

    if (itemsError) setError(itemsError.message);
  }

  async function createProject(proposal: ProposalRow) {
    const projectName = proposal.title || proposal.proposal_number;
    const { error: projectError } = await supabase.from("projects").insert([
      {
        venture_id: proposal.venture_id,
        client_id: proposal.client_id,
        lead_id: proposal.lead_id,
        proposal_id: proposal.id,
        project_name: projectName,
        status: "Planning",
        budget: proposal.subtotal,
        notes: `Created from proposal ${proposal.proposal_number}`,
      },
    ]);

    if (projectError) {
      setError(projectError.message);
      return;
    }

    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this proposal?")) return;
    const { error: deleteError } = await supabase.from("proposals").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadData();
  }

  function statusColor(status: string) {
    if (status === "Accepted") return "bg-green-500/20 text-green-300";
    if (status === "Sent") return "bg-amber-300/15 text-amber-200";
    if (status === "Rejected" || status === "Expired") return "bg-red-500/20 text-red-300";
    return "bg-gray-500/20 text-gray-300";
  }

  if (loading) return <LoadingState />;

  const visibleProposals = filterStatus
    ? proposals.filter((proposal) => proposal.status === filterStatus)
    : proposals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Proposals</h1>
          <p className="text-gray-400">Create quotes, track acceptance, and convert work into invoices or projects.</p>
        </div>
        <button onClick={openAddModal} className="rounded-lg bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-400">
          + Create Proposal
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-200">{error}</div>}

      <FormSelect
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        placeholder="All Statuses"
        options={PROPOSAL_STATUSES.map((status) => ({ value: status, label: status }))}
      />

      {visibleProposals.length === 0 ? (
        <EmptyState icon="📄" title="No proposals yet" description="Create your first proposal before invoicing or starting delivery." />
      ) : (
        <div className="space-y-4">
          {visibleProposals.map((proposal) => (
            <div key={proposal.id} className="rounded-lg border border-amber-300/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{proposal.title}</h2>
                    <span className="text-sm text-gray-500">{proposal.proposal_number}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(proposal.status)}`}>{proposal.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    For {proposal.client_name || proposal.lead_name || "Unassigned"} · {proposal.items.length} item(s)
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-amber-200">{money(proposal.subtotal)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openEditModal(proposal)} className="rounded bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15">
                  Edit
                </button>
                <button onClick={() => setProposalStatus(proposal, "Sent")} className="rounded bg-amber-300/15 px-3 py-2 text-xs text-amber-200 hover:bg-amber-300/25">
                  Mark Sent
                </button>
                <button onClick={() => setProposalStatus(proposal, "Accepted")} className="rounded bg-green-500/15 px-3 py-2 text-xs text-green-300 hover:bg-green-500/25">
                  Accept
                </button>
                <button onClick={() => createProject(proposal)} className="rounded bg-sky-500/15 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/25">
                  Create Project
                </button>
                <button onClick={() => convertToInvoice(proposal)} className="rounded bg-yellow-500/15 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-500/25">
                  Create Invoice
                </button>
                <button onClick={() => handleDelete(proposal.id)} className="rounded bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Proposal" : "Create Proposal"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput label="Proposal Number *" value={formData.proposal_number} onChange={(e) => setFormData({ ...formData, proposal_number: e.target.value })} required />
            <FormInput label="Title *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            <FormSelect
              label="Client"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value, lead_id: e.target.value ? "" : formData.lead_id })}
              placeholder="No client"
              options={clients.map((client) => ({ value: client.id, label: client.client_name }))}
            />
            <FormSelect
              label="Lead"
              value={formData.lead_id}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value, client_id: e.target.value ? "" : formData.client_id })}
              placeholder="No lead"
              options={leads.map((lead) => ({ value: lead.id, label: lead.client_name }))}
            />
            <FormInput label="Issue Date" type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
            <FormInput label="Valid Until" type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} />
          </div>

          <FormSelect
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProposalStatus })}
            options={PROPOSAL_STATUSES.map((status) => ({ value: status, label: status }))}
          />

          <div className="space-y-3 rounded-lg border border-amber-300/10 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Line Items</h3>
              <button type="button" onClick={addItem} className="rounded bg-amber-300/15 px-3 py-1.5 text-xs text-amber-200">
                + Add Item
              </button>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg bg-black/20 p-3">
                <FormInput label="Service *" value={item.service_name} onChange={(e) => updateItem(index, { service_name: e.target.value })} required />
                <FormTextarea label="Description" rows={2} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <FormInput label="Qty" type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
                  <FormInput label="Rate" type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(index, { rate: Number(e.target.value) })} />
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-gray-500">Amount</p>
                    <p className="rounded-xl border border-amber-300/10 bg-black/20 px-4 py-2.5 text-sm text-amber-200">{money(itemAmount(item))}</p>
                  </div>
                </div>
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-xs text-red-300">
                    Remove item
                  </button>
                )}
              </div>
            ))}
            <div className="text-right text-lg font-bold text-amber-200">Total {money(formTotal)}</div>
          </div>

          <FormTextarea label="Notes" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          <FormTextarea label="Terms" rows={3} value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} />

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-amber-300 py-2 font-semibold text-black hover:bg-amber-400 disabled:bg-amber-300/50">
              {submitting ? "Saving..." : "Save Proposal"}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-gray-600 py-2 font-semibold text-white hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
