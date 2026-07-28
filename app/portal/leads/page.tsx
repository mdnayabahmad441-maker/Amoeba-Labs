"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lead, CreateLeadInput, Employee, LEAD_TEMPERATURES, PIPELINE_STAGES } from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import FollowupModal from "@/components/Portal/FollowupModal";
import WhatsAppMessageModal from "@/components/Portal/WhatsAppMessageModal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import DataTable from "@/components/Portal/DataTable";
import NextActionFields from "@/components/Portal/NextActionFields";
import { nextActionWarnings, NextActionThresholds, toDateTimeLocal } from "@/lib/next-action";
import ActivityTimelineModal from "@/components/Portal/ActivityTimelineModal";
import LeadQualificationFields from "@/components/Portal/LeadQualificationFields";
import LeadConversionWizard from "@/components/Portal/LeadConversionWizard";

function temperatureStyle(temperature: string) {
  switch (temperature) {
    case "Hot": return "border-red-400/30 bg-red-500/15 text-red-200";
    case "Warm": return "border-orange-400/30 bg-orange-500/15 text-orange-200";
    case "Cold": return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    case "Not ready": return "border-gray-400/30 bg-gray-500/15 text-gray-300";
    case "Unqualified": return "border-stone-500/30 bg-stone-500/15 text-stone-300";
    default: return "border-gray-500/30 bg-gray-500/15 text-gray-300";
  }
}

function temperatureDescription(temperature: string) {
  switch (temperature) {
    case "Hot": return "Strong buying signals. Prioritize the immediate next action.";
    case "Warm": return "Real opportunity. Clarify budget, authority, or timeline.";
    case "Cold": return "Low urgency or engagement. Nurture with a dated action.";
    case "Not ready": return "Potential fit, but the buying timing is not active.";
    case "Unqualified": return "Not a viable opportunity. Record the reason and stop active pursuit.";
    default: return "Review the qualification and choose the next action.";
  }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterTemperature, setFilterTemperature] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ventureId, setVentureId] = useState("");
  const [followupLead, setFollowupLead] = useState<Lead | null>(null);
  const [messageLead, setMessageLead] = useState<Lead | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [thresholds, setThresholds] = useState<NextActionThresholds>({ noContactDays: 7, stuckLeadDays: 14, clientUpdateDays: 14 });
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState<CreateLeadInput>({
    client_name: "",
    contact_person: "",
    phone: "",
    email: "",
    source: "",
    notes: "",
    next_follow_up: "",
    next_action_type: "",
    next_action_at: "",
    communication_channel: "",
    responsible_employee_id: "",
    expected_outcome: "",
    last_contact_at: "",
    follow_up_priority: "Medium",
    follow_up_notes: "",
    pipeline_stage: "New", lead_temperature: "Cold", decision_maker_identified: false,
  });

  const loadData = useCallback(async function loadData() {
    try {
      setLoading(true);

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

      let query = supabase.from("leads").select("*").eq("venture_id", vId).is("archived_at", null);

      if (searchTerm) {
        query = query.or(
          `client_name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }
      if (filterStage) query = query.eq("pipeline_stage", filterStage);
      if (filterTemperature) query = query.eq("lead_temperature", filterTemperature);

      const [leadResult, employeeResult, settingsResult] = await Promise.all([
        query.order("created_at", { ascending: false }),
        supabase.from("employees").select("*").eq("venture_id", vId).eq("status", "Active").is("archived_at", null).order("is_founder", { ascending: false }).order("full_name"),
        supabase.from("business_settings").select("no_contact_warning_days, lead_stuck_warning_days, client_update_warning_days").eq("venture_id", vId).maybeSingle(),
      ]);
      const { data, error: err } = leadResult;
      if (err) throw err;
      setLeads(data || []);
      if (!employeeResult.error) setEmployees((employeeResult.data || []) as Employee[]);
      if (!settingsResult.error && settingsResult.data) setThresholds({ noContactDays: settingsResult.data.no_contact_warning_days, stuckLeadDays: settingsResult.data.lead_stuck_warning_days, clientUpdateDays: settingsResult.data.client_update_warning_days });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load leads.");
    } finally {
      setLoading(false);
    }
  }, [filterStage, filterTemperature, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function openAddModal() {
    const founder = employees.find((employee) => employee.is_founder);
    setFormData({
      client_name: "",
      contact_person: "",
      phone: "",
      email: "",
      source: "",
      notes: "",
      next_follow_up: "",
      next_action_type: "", next_action_at: "", communication_channel: "", responsible_employee_id: founder?.id || "", expected_outcome: "", last_contact_at: "", follow_up_priority: "Medium", follow_up_notes: "",
      pipeline_stage: "New", lead_temperature: "Cold", decision_maker_identified: false,
    });
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(lead: Lead) {
    setFormData({
      client_name: lead.client_name,
      contact_person: lead.contact_person || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      notes: lead.notes || "",
      next_follow_up: lead.next_follow_up || "",
      next_action_type: lead.next_action_type || "",
      next_action_at: toDateTimeLocal(lead.next_action_at),
      communication_channel: lead.communication_channel || "",
      responsible_employee_id: lead.responsible_employee_id || "",
      expected_outcome: lead.expected_outcome || "",
      last_contact_at: toDateTimeLocal(lead.last_contact_at),
      follow_up_priority: lead.follow_up_priority || "Medium",
      follow_up_notes: lead.follow_up_notes || "",
      pipeline_stage: lead.pipeline_stage || "New", lead_temperature: lead.lead_temperature || "Cold", business_type: lead.business_type || "", industry: lead.industry || "", location: lead.location || "", company_size: lead.company_size || "", number_of_branches: lead.number_of_branches ?? "", main_business_problem: lead.main_business_problem || "", problem_severity: lead.problem_severity ?? "", current_workaround: lead.current_workaround || "", existing_software: lead.existing_software || "", budget_range: lead.budget_range || "", expected_project_value: lead.expected_project_value ?? "", decision_maker_name: lead.decision_maker_name || "", decision_maker_identified: lead.decision_maker_identified, urgency: lead.urgency ?? "", buying_timeline: lead.buying_timeline || "", authority_level: lead.authority_level ?? "", need_level: lead.need_level ?? "", ability_to_pay: lead.ability_to_pay ?? "", probability_of_closing: lead.probability_of_closing ?? "", competitor_considered: lead.competitor_considered || "", qualification_notes: lead.qualification_notes || "", disqualification_reason: lead.disqualification_reason || "", lost_reason: lead.lost_reason || "", engagement_score: lead.engagement_score ?? "", timeline_score: lead.timeline_score ?? "", founder_company_fit: lead.founder_company_fit ?? "",
    });
    setEditingId(lead.id);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formData.pipeline_stage === "Lost" && !formData.lost_reason?.trim()) {
      setError("A lost reason is required before moving a lead to Lost.");
      return;
    }
    if (formData.lead_temperature === "Unqualified" && !formData.disqualification_reason?.trim()) {
      setError("A disqualification reason is required for an unqualified lead.");
      return;
    }
    setSubmitting(true);
    try {
      const nullableNumber = (value: number | "" | undefined) => value === "" || value === undefined ? null : value;
      const payload = { ...formData, next_action_type: formData.next_action_type || null, next_action_at: formData.next_action_at ? new Date(formData.next_action_at).toISOString() : null, communication_channel: formData.communication_channel || null, responsible_employee_id: formData.responsible_employee_id || null, expected_outcome: formData.expected_outcome?.trim() || null, last_contact_at: formData.last_contact_at ? new Date(formData.last_contact_at).toISOString() : null, follow_up_notes: formData.follow_up_notes?.trim() || null, next_follow_up: formData.next_action_at ? formData.next_action_at.slice(0, 10) : formData.next_follow_up || null, number_of_branches: nullableNumber(formData.number_of_branches), problem_severity: nullableNumber(formData.problem_severity), expected_project_value: nullableNumber(formData.expected_project_value), urgency: nullableNumber(formData.urgency), authority_level: nullableNumber(formData.authority_level), need_level: nullableNumber(formData.need_level), ability_to_pay: nullableNumber(formData.ability_to_pay), probability_of_closing: nullableNumber(formData.probability_of_closing), engagement_score: nullableNumber(formData.engagement_score), timeline_score: nullableNumber(formData.timeline_score), founder_company_fit: nullableNumber(formData.founder_company_fit) };
      let savedId = editingId;
      if (editingId) {
        const { error: err } = await supabase
          .from("leads")
          .update(payload)
          .eq("id", editingId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from("leads")
          .insert([{ ...payload, venture_id: ventureId }]).select("id").single();
        if (err) throw err;
        savedId = data.id;
      }
      if (savedId) await supabase.from("activity_logs").insert([{ venture_id: ventureId, record_type: "Lead", record_id: savedId, action: editingId ? "lead_updated" : "lead_created", details: { pipeline_stage: payload.pipeline_stage, lead_temperature: payload.lead_temperature, next_action_type: payload.next_action_type, next_action_at: payload.next_action_at, responsible_employee_id: payload.responsible_employee_id, priority: payload.follow_up_priority } }]);
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save lead.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Archive this lead? It will be removed from active views but retained in business history.")) return;
    try {
      const { error: err } = await supabase.from("leads").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (err) throw err;
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to delete lead.");
    }
  }

  async function completeNextAction(lead: Lead) {
    if (!lead.next_action_at || !lead.next_action_type) return;
    const outcome = window.prompt("What happened? Add a short outcome note.");
    if (outcome === null) return;
    try {
      const { error: completionError } = await supabase.rpc("complete_primary_next_action", {
        target_type: "Lead",
        target_id: lead.id,
        outcome_note: outcome.trim() || null,
        replacement_type: null,
        replacement_at: null,
      });
      if (completionError) throw completionError;
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete the next action. Apply the Phase 8 migration first.");
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "New": return "bg-amber-300/15 text-amber-200";
      case "Contacted": return "bg-stone-300/10 text-stone-300";
      case "Qualified": return "bg-sky-500/20 text-sky-300";
      case "Meeting/Demo": return "bg-yellow-500/20 text-yellow-300";
      case "Proposal": return "bg-orange-500/20 text-orange-300";
      case "Negotiation": return "bg-amber-500/20 text-amber-300";
      case "Won": return "bg-green-500/20 text-green-300";
      case "Lost": return "bg-red-500/20 text-red-300";
      default: return "bg-gray-500/20 text-gray-300";
    }
  };

  if (loading) return <LoadingState />;

  const warningCount = leads.filter((lead) => nextActionWarnings(lead, thresholds).length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 sm:text-4xl">Leads CRM</h1>
          <p className="text-gray-400">Track and manage your sales pipeline</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full bg-amber-300 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition sm:w-auto"
        >
          + Add Lead
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {warningCount > 0 && <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-4 text-sm text-orange-200"><span className="font-bold">{warningCount} active lead{warningCount === 1 ? "" : "s"}</span> need a next-action review.</div>}

      {/* Search & Filter */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <input
          type="text"
          placeholder="Search leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-amber-300/5 border border-amber-300/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <FormSelect
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          placeholder="All Stages"
          options={PIPELINE_STAGES.map((stage) => ({ value: stage, label: stage }))}
        />
        <FormSelect value={filterTemperature} onChange={(e) => setFilterTemperature(e.target.value)} placeholder="All temperatures" options={LEAD_TEMPERATURES.map((temperature) => ({ value: temperature, label: temperature }))} />
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No leads yet"
          description="Create your first lead to start tracking your sales pipeline"
        />
      ) : (
        <DataTable
          data={leads}
          columns={[
            { key: "client_name", label: "Client Name" },
            {
              key: "contact_person",
              label: "Contact",
              render: (value) => value || "-",
            },
            {
              key: "email",
              label: "Email",
              render: (value) => value || "-",
            },
            {
              key: "pipeline_stage",
              label: "Pipeline",
              render: (value) => <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStageColor(value)}`}>{value}</span>,
            },
            {
              key: "lead_temperature",
              label: "Priority",
              render: (value, lead) => (
                <div className="max-w-64 space-y-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${temperatureStyle(value)}`}>{value}</span>
                  <p className="text-xs text-gray-400">{temperatureDescription(value)}</p>
                  <details className="text-[11px] text-gray-500">
                    <summary className="cursor-pointer select-none hover:text-gray-300">Advanced score details</summary>
                    <div className="mt-2 space-y-1 border-l border-white/10 pl-3">
                      <p>Score: {lead.lead_score ?? 0}/100 · {lead.score_confidence || "Low"} confidence</p>
                      {lead.score_reason && <p>{lead.score_reason}</p>}
                      {lead.recommended_next_action && <p className="text-amber-200/70">System suggestion: {lead.recommended_next_action}</p>}
                    </div>
                  </details>
                </div>
              ),
            },
            {
              key: "next_follow_up",
              label: "Next Action",
              render: (_value, lead) => {
                const warnings = nextActionWarnings(lead, thresholds);
                const owner = employees.find((employee) => employee.id === lead.responsible_employee_id);
                return <div className="space-y-1"><p>{lead.next_action_type || "Not set"}{lead.next_action_at ? ` · ${new Date(lead.next_action_at).toLocaleString("en-IN")}` : ""}</p><p className="text-xs text-gray-500">{owner?.full_name || "Unassigned"} · {lead.follow_up_priority || "Medium"}{lead.last_contact_at ? ` · Last contact ${new Date(lead.last_contact_at).toLocaleDateString("en-IN")}` : " · Never contacted"}</p>{warnings.map((warning) => <span key={warning.code} className={`mr-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${warning.severity === "danger" ? "bg-red-500/15 text-red-300" : "bg-orange-500/15 text-orange-300"}`}>{warning.label}</span>)}{lead.next_action_at && <button onClick={() => completeNextAction(lead)} className="mt-1 block rounded bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-300 hover:bg-green-500/20">Complete action</button>}</div>;
            },
            },
          ]}
          actions={(lead) => (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimelineLead(lead)}
                className="text-xs px-2 py-1 bg-white/10 text-gray-200 rounded hover:bg-white/15 transition"
              >
                History
              </button>
              <button
                onClick={() => setMessageLead(lead)}
                className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition font-medium"
              >
                WhatsApp
              </button>
              <button
                onClick={() => setFollowupLead(lead)}
                className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/30 transition font-medium"
              >
                Follow-up
              </button>
              <button
                onClick={() => openEditModal(lead)}
                className="text-xs px-2 py-1 bg-amber-300/20 text-amber-200 rounded hover:bg-amber-300/30 transition"
              >
                Edit
              </button>
              {!["Lost"].includes(lead.pipeline_stage) && lead.lead_temperature !== "Unqualified" && (
                <button
                  onClick={() => setConversionLead(lead)}
                  className="rounded bg-green-500/15 px-2 py-1 text-xs font-medium text-green-300 hover:bg-green-500/25"
                >
                  Convert
                </button>
              )}
              <button
                onClick={() => handleDelete(lead.id)}
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
        title={editingId ? "Edit Lead" : "Add New Lead"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Client / Organization Name *"
            type="text"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            required
            placeholder="Enter client or organization name"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Contact person"
              type="text"
              value={formData.contact_person || ""}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="Primary contact"
            />
            <FormInput
              label="Phone / WhatsApp"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contact number"
            />
            <FormInput
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Contact email"
            />
            <FormInput
              label="Lead source"
              type="text"
              value={formData.source || ""}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Referral, Website, Field visit..."
            />
          </div>

          <LeadQualificationFields value={formData} onChange={setFormData} />

          <NextActionFields value={formData} employees={employees} onChange={setFormData} />

          <FormTextarea
            label="Notes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add notes about this lead"
            rows={3}
          />

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-300 hover:bg-amber-400 disabled:bg-amber-300/50 text-black font-semibold py-2 rounded-lg transition"
            >
              {submitting ? "Saving..." : editingId ? "Update Lead" : "Add Lead"}
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

      {/* Quick follow-up modal */}
      {followupLead && (
        <FollowupModal
          isOpen={!!followupLead}
          onClose={() => setFollowupLead(null)}
          onSaved={() => { setFollowupLead(null); loadData(); }}
          ventureId={ventureId}
          leadId={followupLead.id}
          contactName={followupLead.client_name}
        />
      )}

      {messageLead && (
        <WhatsAppMessageModal
          isOpen={!!messageLead}
          onClose={() => setMessageLead(null)}
          onSent={() => loadData()}
          ventureId={ventureId}
          leadId={messageLead.id}
          contactName={messageLead.contact_person || messageLead.client_name}
          phone={messageLead.phone}
        />
      )}
      {timelineLead && <ActivityTimelineModal isOpen={Boolean(timelineLead)} onClose={() => setTimelineLead(null)} ventureId={timelineLead.venture_id} recordType="Lead" recordId={timelineLead.id} recordName={timelineLead.client_name} />}
      {conversionLead && <LeadConversionWizard lead={conversionLead} isOpen={Boolean(conversionLead)} onClose={() => setConversionLead(null)} onConverted={() => { setConversionLead(null); loadData(); }} />}
    </div>
  );
}
