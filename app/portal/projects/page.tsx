"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Client,
  Lead,
  MILESTONE_STATUSES,
  MilestoneStatus,
  Project,
  ProjectMilestone,
  ProjectProfitability,
  PROJECT_STATUSES,
  ProjectStatus,
  Proposal,
} from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";
import ActivityTimelineModal from "@/components/Portal/ActivityTimelineModal";

type ProjectRow = Project & {
  milestones: ProjectMilestone[];
  client_name?: string;
  lead_name?: string;
  proposal_number?: string;
  profitability?: ProjectProfitability;
};

type ProjectForm = {
  client_id: string;
  lead_id: string;
  proposal_id: string;
  project_name: string;
  status: ProjectStatus;
  start_date: string;
  due_date: string;
  budget: number;
  notes: string;
  agreement_required: boolean;
  agreement_status: Project["agreement_status"];
  deposit_required: boolean;
  deposit_amount: number;
  deposit_received: boolean;
  requirements_received: boolean;
  onboarding_completed: boolean;
  recognized_revenue: number;
  profitability_basis: Project["profitability_basis"];
  direct_cost_budget: number;
  estimated_hours: number;
  actual_hours: number;
};

type MilestoneForm = {
  title: string;
  description: string;
  due_date: string;
  status: MilestoneStatus;
  amount: number;
};

const emptyProject: ProjectForm = {
  client_id: "",
  lead_id: "",
  proposal_id: "",
  project_name: "",
  status: "Awaiting Requirements",
  start_date: "",
  due_date: "",
  budget: 0,
  notes: "",
  agreement_required: false,
  agreement_status: "Not required",
  deposit_required: false,
  deposit_amount: 0,
  deposit_received: false,
  requirements_received: false,
  onboarding_completed: false,
  recognized_revenue: 0,
  profitability_basis: "Collected",
  direct_cost_budget: 0,
  estimated_hours: 0,
  actual_hours: 0,
};

const emptyMilestone: MilestoneForm = {
  title: "",
  description: "",
  due_date: "",
  status: "Not Started",
  amount: 0,
};

const money = (value: number | null | undefined) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
type DirectCostType = "Contractor" | "Employee" | "Software" | "API" | "Travel" | "Other";
type DirectCostLine = {
  id: string;
  direct_cost_type: DirectCostType;
  amount: number;
  expense_date: string;
  vendor: string;
  notes: string;
};
const newCostLine = (type: DirectCostLine["direct_cost_type"], date: string): DirectCostLine => ({
  id: crypto.randomUUID(), direct_cost_type: type, amount: 0, expense_date: date, vendor: "", notes: "",
});

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ventureId, setVentureId] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [milestoneProject, setMilestoneProject] = useState<ProjectRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timelineProject, setTimelineProject] = useState<ProjectRow | null>(null);
  const [costProject, setCostProject] = useState<ProjectRow | null>(null);
  const [costLines, setCostLines] = useState<DirectCostLine[]>([]);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(emptyMilestone);

  useEffect(() => {
    loadData();
  }, []);

  const visibleProjects = useMemo(
    () => (filterStatus ? projects.filter((project) => project.status === filterStatus) : projects),
    [filterStatus, projects]
  );
  const newCostTotal = costLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const projectRevenue = Number(costProject?.profitability?.profitability_revenue || costProject?.recognized_revenue || 0);
  const existingProjectCosts = Number(costProject?.profitability?.direct_costs || 0);
  const projectedProjectProfit = projectRevenue - existingProjectCosts - newCostTotal;

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const { data: ventures } = await supabase.from("ventures").select("id").eq("status", "Active").is("archived_at", null).order("is_default", { ascending: false }).order("created_at", { ascending: true }).limit(1);
      if (!ventures || ventures.length === 0) {
        setError("No active venture found.");
        return;
      }

      const activeVentureId = ventures[0].id;
      setVentureId(activeVentureId);

      const [clientsRes, leadsRes, proposalsRes, projectsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("venture_id", activeVentureId).is("archived_at", null).order("client_name"),
        supabase.from("leads").select("*").eq("venture_id", activeVentureId).is("archived_at", null).order("created_at", { ascending: false }),
        supabase.from("proposals").select("*").eq("venture_id", activeVentureId).is("archived_at", null).order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("venture_id", activeVentureId).is("archived_at", null).order("created_at", { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (proposalsRes.error) throw proposalsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const projectRows = (projectsRes.data || []) as Project[];
      const projectIds = projectRows.map((project) => project.id);
      const [milestoneRes, profitabilityRes] = projectIds.length
        ? await Promise.all([
            supabase.from("project_milestones").select("*").in("project_id", projectIds).order("due_date", { ascending: true }),
            supabase.from("project_profitability").select("*").in("project_id", projectIds),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];

      if (milestoneRes.error) throw milestoneRes.error;
      if (profitabilityRes.error && !profitabilityRes.error.message.includes("project_profitability")) throw profitabilityRes.error;

      const clientRows = (clientsRes.data || []) as Client[];
      const leadRows = (leadsRes.data || []) as Lead[];
      const proposalRows = (proposalsRes.data || []) as Proposal[];
      const clientMap = new Map(clientRows.map((client) => [client.id, client.client_name]));
      const leadMap = new Map(leadRows.map((lead) => [lead.id, lead.client_name]));
      const proposalMap = new Map(proposalRows.map((proposal) => [proposal.id, proposal.proposal_number]));
      const milestoneMap = new Map<string, ProjectMilestone[]>();
      const profitabilityMap = new Map(((profitabilityRes.data || []) as ProjectProfitability[]).map((row) => [row.project_id, row]));

      ((milestoneRes.data || []) as ProjectMilestone[]).forEach((milestone) => {
        milestoneMap.set(milestone.project_id, [...(milestoneMap.get(milestone.project_id) || []), milestone]);
      });

      setClients(clientRows);
      setLeads(leadRows);
      setProposals(proposalRows);
      setProjects(
        projectRows.map((project) => ({
          ...project,
          milestones: milestoneMap.get(project.id) || [],
          client_name: project.client_id ? clientMap.get(project.client_id) : undefined,
          lead_name: project.lead_id ? leadMap.get(project.lead_id) : undefined,
          proposal_number: project.proposal_id ? proposalMap.get(project.proposal_id) : undefined,
          profitability: profitabilityMap.get(project.id),
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }

  function openAddProject() {
    setProjectForm(emptyProject);
    setEditingId(null);
    setShowProjectModal(true);
  }

  function openEditProject(project: ProjectRow) {
    setProjectForm({
      client_id: project.client_id || "",
      lead_id: project.lead_id || "",
      proposal_id: project.proposal_id || "",
      project_name: project.project_name,
      status: project.status,
      start_date: project.start_date || "",
      due_date: project.due_date || "",
      budget: Number(project.budget || 0),
      notes: project.notes || "",
      agreement_required: project.agreement_required ?? false,
      agreement_status: project.agreement_status || "Not required",
      deposit_required: project.deposit_required ?? false,
      deposit_amount: Number(project.deposit_amount || 0),
      deposit_received: project.deposit_received ?? false,
      requirements_received: project.requirements_received ?? false,
      onboarding_completed: project.onboarding_completed ?? false,
      recognized_revenue: Number(project.recognized_revenue || 0),
      profitability_basis: project.profitability_basis || "Collected",
      direct_cost_budget: Number(project.direct_cost_budget || 0),
      estimated_hours: Number(project.estimated_hours || 0),
      actual_hours: Number(project.actual_hours || 0),
    });
    setEditingId(project.id);
    setShowProjectModal(true);
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        venture_id: ventureId,
        client_id: projectForm.client_id || null,
        lead_id: projectForm.lead_id || null,
        proposal_id: projectForm.proposal_id || null,
        project_name: projectForm.project_name,
        status: projectForm.status,
        start_date: projectForm.start_date || null,
        due_date: projectForm.due_date || null,
        budget: projectForm.budget || 0,
        notes: projectForm.notes || null,
        agreement_required: projectForm.agreement_required,
        agreement_status: projectForm.agreement_required ? projectForm.agreement_status : "Not required",
        deposit_required: projectForm.deposit_required,
        deposit_amount: projectForm.deposit_required ? projectForm.deposit_amount : 0,
        deposit_received: projectForm.deposit_required ? projectForm.deposit_received : false,
        requirements_received: projectForm.requirements_received,
        onboarding_completed: projectForm.onboarding_completed,
        recognized_revenue: projectForm.recognized_revenue,
        profitability_basis: projectForm.profitability_basis,
        direct_cost_budget: projectForm.direct_cost_budget,
        estimated_hours: projectForm.estimated_hours,
        actual_hours: projectForm.actual_hours,
        updated_at: new Date().toISOString(),
      };

      const { error: projectError } = editingId
        ? await supabase.from("projects").update(payload).eq("id", editingId)
        : await supabase.from("projects").insert([payload]);

      if (projectError) throw projectError;

      setShowProjectModal(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save project.");
    } finally {
      setSubmitting(false);
    }
  }

  function openMilestone(project: ProjectRow) {
    setMilestoneProject(project);
    setMilestoneForm(emptyMilestone);
    setShowMilestoneModal(true);
  }

  async function saveMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!milestoneProject) return;
    setSubmitting(true);
    setError("");

    try {
      const { error: milestoneError } = await supabase.from("project_milestones").insert([
        {
          project_id: milestoneProject.id,
          title: milestoneForm.title,
          description: milestoneForm.description || null,
          due_date: milestoneForm.due_date || null,
          status: milestoneForm.status,
          amount: milestoneForm.amount || 0,
        },
      ]);

      if (milestoneError) throw milestoneError;

      setShowMilestoneModal(false);
      setMilestoneProject(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save milestone.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateMilestoneStatus(id: string, status: MilestoneStatus) {
    const { error: milestoneError } = await supabase.from("project_milestones").update({ status }).eq("id", id);
    if (milestoneError) {
      setError(milestoneError.message);
      return;
    }
    loadData();
  }

  async function deleteProject(id: string) {
    if (!confirm("Archive this project? Its delivery and milestone history will be retained.")) return;
    const { error: deleteError } = await supabase.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadData();
  }

  async function overrideProjectStart(project: ProjectRow) {
    const reason = window.prompt("Why should this project start before all required gates are complete?");
    if (!reason?.trim()) return;
    const { error: overrideError } = await supabase.rpc("activate_project_with_override", {
      target_project: project.id,
      override_reason: reason.trim(),
    });
    if (overrideError) {
      setError(overrideError.message);
      return;
    }
    await loadData();
  }

  function openDirectCost(project: ProjectRow) {
    setCostProject(project);
    const date = new Date().toISOString().slice(0, 10);
    setCostLines(Array.from({ length: 4 }, () => newCostLine("Other", date)));
  }

  async function saveDirectCost(event: React.FormEvent) {
    event.preventDefault();
    if (!costProject) return;
    const validLines = costLines.filter((line) => line.amount > 0);
    if (!validLines.length) { setError("Enter an amount for at least one direct-cost line."); return; }
    setSubmitting(true);
    const { error: costError } = await supabase.from("expenses").insert(validLines.map((line) => ({
      venture_id: costProject.venture_id,
      project_id: costProject.id,
      direct_cost_type: line.direct_cost_type,
      category: "Client Work",
      amount: line.amount,
      expense_date: line.expense_date,
      payment_method: "Bank Transfer",
      vendor: line.vendor.trim() || null,
      notes: line.notes.trim() || null,
    })));
    setSubmitting(false);
    if (costError) { setError(costError.message); return; }
    setCostProject(null);
    await loadData();
  }

  function startBlockers(project: ProjectRow) {
    const blockers: string[] = [];
    if (project.agreement_required && project.agreement_status !== "Accepted") blockers.push("Agreement");
    if (project.deposit_required && !project.deposit_received) blockers.push("Deposit");
    if (!project.requirements_received) blockers.push("Requirements");
    if (!project.onboarding_completed) blockers.push("Onboarding");
    return blockers;
  }

  function progress(project: ProjectRow) {
    if (!project.milestones.length) return project.status === "Completed" ? 100 : 0;
    return Math.round((project.milestones.filter((m) => m.status === "Done").length / project.milestones.length) * 100);
  }

  function statusColor(status: string) {
    if (status === "Completed" || status === "Done") return "bg-green-500/20 text-green-300";
    if (status === "Active" || status === "In Progress") return "bg-amber-300/15 text-amber-200";
    if (status === "On Hold" || status === "Blocked") return "bg-red-500/20 text-red-300";
    return "bg-gray-500/20 text-gray-300";
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Projects</h1>
          <p className="text-gray-400">Track delivery, milestones, budgets, and client work.</p>
        </div>
        <button onClick={openAddProject} className="rounded-lg bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-400">
          + Add Project
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-200">{error}</div>}

      <FormSelect
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        placeholder="All Statuses"
        options={PROJECT_STATUSES.map((status) => ({ value: status, label: status }))}
      />

      {visibleProjects.length === 0 ? (
        <EmptyState icon="🧩" title="No projects yet" description="Create a project once a proposal is accepted or work begins." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleProjects.map((project) => (
            <div key={project.id} className="rounded-lg border border-amber-300/10 bg-black/20 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{project.project_name}</h2>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(project.status)}`}>{project.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {project.client_name || project.lead_name || "Unassigned"}
                    {project.proposal_number ? ` · ${project.proposal_number}` : ""}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Budget</p>
                  <p className="text-lg font-bold text-amber-200">{money(project.budget)}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{progress(project)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-amber-300" style={{ width: `${progress(project)}%` }} />
                </div>
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${project.ready_to_start_status === "Ready" ? "border-green-500/20 bg-green-500/10" : project.ready_to_start_status === "Overridden" ? "border-orange-500/20 bg-orange-500/10" : "border-red-500/20 bg-red-500/10"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Start readiness: {project.ready_to_start_status}</p>
                  {project.ready_to_start_status === "Blocked" && <button onClick={() => overrideProjectStart(project)} className="rounded bg-orange-500/15 px-2 py-1 text-xs font-semibold text-orange-200">Founder override</button>}
                </div>
                {startBlockers(project).length > 0 ? <p className="mt-1 text-xs text-red-200">Blocked by: {startBlockers(project).join(", ")}</p> : <p className="mt-1 text-xs text-green-300">All commercial and onboarding gates are complete.</p>}
                {project.start_override_reason && <p className="mt-1 text-xs text-orange-200">Override reason: {project.start_override_reason}</p>}
              </div>

              {project.profitability ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-sm font-semibold text-white">Project money</p><p className="text-[11px] text-gray-500">Income − expenses = profit or loss</p></div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${project.profitability.profitability_revenue <= 0 ? "bg-white/8 text-gray-400" : project.profitability.gross_profit > 0 ? "bg-green-500/15 text-green-300" : project.profitability.gross_profit < 0 ? "bg-red-500/15 text-red-300" : "bg-amber-300/15 text-amber-200"}`}>{project.profitability.profitability_revenue <= 0 ? "Add income" : project.profitability.gross_profit > 0 ? "Profitable" : project.profitability.gross_profit < 0 ? "Loss-making" : "Break-even"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div><p className="text-gray-500">Project income</p><p className="font-semibold text-white">{money(project.profitability.profitability_revenue)}</p></div>
                    <div><p className="text-gray-500">All expenses</p><p className="font-semibold text-red-300">{money(project.profitability.direct_costs)}</p></div>
                    <div><p className="text-gray-500">{project.profitability.gross_profit >= 0 ? "Your profit" : "Your loss"}</p><p className={`font-bold ${project.profitability.gross_profit >= 0 ? "text-green-300" : "text-red-300"}`}>{money(Math.abs(project.profitability.gross_profit))}</p></div>
                    <div><p className="text-gray-500">Client still has to pay</p><p className="font-semibold text-orange-200">{money(project.profitability.outstanding_amount)}</p></div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    {money(project.profitability.profitability_revenue)} income - {money(project.profitability.direct_costs)} expenses ={" "}
                    <span className={project.profitability.gross_profit >= 0 ? "text-green-300" : "text-red-300"}>
                      {money(Math.abs(project.profitability.gross_profit))} {project.profitability.gross_profit >= 0 ? "profit" : "loss"}
                    </span>
                  </p>
                  <details className="mt-3 text-xs text-gray-400"><summary className="cursor-pointer text-sky-300">Cost breakdown</summary><p className="mt-2">Contractor {money(project.profitability.contractor_cost)} · Employee {money(project.profitability.employee_cost)} · Software {money(project.profitability.software_cost)} · API {money(project.profitability.api_cost)} · Travel {money(project.profitability.travel_cost)} · Other {money(project.profitability.other_cost)}</p></details>
                </div>
              ) : <p className="mt-4 rounded-xl border border-sky-500/15 bg-sky-500/5 p-3 text-xs text-sky-200">Apply the Phase 11 migration to calculate project profitability.</p>}

              <div className="mt-4 space-y-2">
                {project.milestones.length === 0 ? (
                  <p className="text-sm text-gray-500">No milestones yet.</p>
                ) : (
                  project.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex flex-col gap-2 rounded-lg bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{milestone.title}</p>
                        <p className="text-xs text-gray-500">{milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : "No due date"}</p>
                      </div>
                      <FormSelect
                        value={milestone.status}
                        onChange={(e) => updateMilestoneStatus(milestone.id, e.target.value as MilestoneStatus)}
                        options={MILESTONE_STATUSES.map((status) => ({ value: status, label: status }))}
                        className="sm:w-40"
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setTimelineProject(project)} className="rounded bg-amber-300/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-300/20">
                  Timeline
                </button>
                <button onClick={() => openDirectCost(project)} className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                  + Direct cost
                </button>
                <button onClick={() => openMilestone(project)} className="rounded bg-sky-500/15 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/25">
                  + Milestone
                </button>
                <button onClick={() => openEditProject(project)} className="rounded bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15">
                  Edit
                </button>
                <button onClick={() => deleteProject(project.id)} className="rounded bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25">
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {timelineProject && <ActivityTimelineModal isOpen={Boolean(timelineProject)} onClose={() => setTimelineProject(null)} ventureId={timelineProject.venture_id} recordType="Project" recordId={timelineProject.id} recordName={timelineProject.project_name} />}

      <Modal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} title={editingId ? "Edit Project" : "Add Project"}>
        <form onSubmit={saveProject} className="space-y-4">
          <FormInput label="Project Name *" value={projectForm.project_name} onChange={(e) => setProjectForm({ ...projectForm, project_name: e.target.value })} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Client"
              value={projectForm.client_id}
              onChange={(e) => setProjectForm({ ...projectForm, client_id: e.target.value, lead_id: e.target.value ? "" : projectForm.lead_id })}
              placeholder="No client"
              options={clients.map((client) => ({ value: client.id, label: client.client_name }))}
            />
            <FormSelect
              label="Lead"
              value={projectForm.lead_id}
              onChange={(e) => setProjectForm({ ...projectForm, lead_id: e.target.value, client_id: e.target.value ? "" : projectForm.client_id })}
              placeholder="No lead"
              options={leads.map((lead) => ({ value: lead.id, label: lead.client_name }))}
            />
            <FormSelect
              label="Proposal"
              value={projectForm.proposal_id}
              onChange={(e) => setProjectForm({ ...projectForm, proposal_id: e.target.value })}
              placeholder="No proposal"
              options={proposals.map((proposal) => ({ value: proposal.id, label: proposal.proposal_number }))}
            />
            <FormSelect label="Status" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })} options={PROJECT_STATUSES.map((status) => ({ value: status, label: status }))} />
            <FormInput label="Start Date" type="date" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} />
            <FormInput label="Due Date" type="date" value={projectForm.due_date} onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })} />
          </div>
          <section className="space-y-4 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
            <div><h3 className="font-semibold text-amber-200">Commercial and onboarding gates</h3><p className="text-xs text-gray-500">The database prevents Active status until every required gate is complete.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={projectForm.agreement_required} onChange={(e) => setProjectForm({ ...projectForm, agreement_required: e.target.checked, agreement_status: e.target.checked ? "Pending" : "Not required" })} className="accent-amber-300" />Agreement required</label>
              {projectForm.agreement_required && <FormSelect label="Agreement status" value={projectForm.agreement_status} onChange={(e) => setProjectForm({ ...projectForm, agreement_status: e.target.value as Project["agreement_status"] })} options={["Pending","Accepted"].map((value) => ({ value, label: value }))} />}
              <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={projectForm.deposit_required} onChange={(e) => setProjectForm({ ...projectForm, deposit_required: e.target.checked })} className="accent-amber-300" />Deposit required</label>
              {projectForm.deposit_required && <FormInput label="Deposit amount" type="number" min="0" value={projectForm.deposit_amount} onChange={(e) => setProjectForm({ ...projectForm, deposit_amount: Number(e.target.value) })} />}
              {projectForm.deposit_required && <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={projectForm.deposit_received} onChange={(e) => setProjectForm({ ...projectForm, deposit_received: e.target.checked })} className="accent-green-400" />Deposit received</label>}
              <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={projectForm.requirements_received} onChange={(e) => setProjectForm({ ...projectForm, requirements_received: e.target.checked })} className="accent-green-400" />Requirements received</label>
              <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-gray-300"><input type="checkbox" checked={projectForm.onboarding_completed} onChange={(e) => setProjectForm({ ...projectForm, onboarding_completed: e.target.checked })} className="accent-green-400" />Onboarding completed</label>
            </div>
          </section>
          <FormInput label="Budget" type="number" min="0" step="0.01" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: Number(e.target.value) })} />
          <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div><h3 className="font-semibold text-white">Project money</h3><p className="text-xs text-gray-500">Enter what the client is paying. Add real expenses later with + Direct cost.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Project income" type="number" min="0" step="0.01" value={projectForm.recognized_revenue} onChange={(e) => setProjectForm({ ...projectForm, recognized_revenue: Number(e.target.value), profitability_basis: "Recognized" })} />
              <FormInput label="Expected expense budget (optional)" type="number" min="0" step="0.01" value={projectForm.direct_cost_budget} onChange={(e) => setProjectForm({ ...projectForm, direct_cost_budget: Number(e.target.value) })} />
            </div>
            <details className="rounded-lg border border-white/10 p-3">
              <summary className="cursor-pointer text-sm text-gray-300">Optional time tracking</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormInput label="Estimated hours" type="number" min="0" step="0.25" value={projectForm.estimated_hours} onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: Number(e.target.value) })} />
                <FormInput label="Actual hours" type="number" min="0" step="0.25" value={projectForm.actual_hours} onChange={(e) => setProjectForm({ ...projectForm, actual_hours: Number(e.target.value) })} />
              </div>
            </details>
          </section>
          <FormTextarea label="Notes" rows={3} value={projectForm.notes} onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })} />
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-amber-300 py-2 font-semibold text-black hover:bg-amber-400 disabled:bg-amber-300/50">
              {submitting ? "Saving..." : "Save Project"}
            </button>
            <button type="button" onClick={() => setShowProjectModal(false)} className="flex-1 rounded-lg bg-gray-600 py-2 font-semibold text-white hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(costProject)} onClose={() => setCostProject(null)} title={`Add project expenses · ${costProject?.project_name || ""}`}>
        <form onSubmit={saveDirectCost} className="space-y-4">
          <p className="text-sm text-gray-400">Simply write what you paid for and the amount. Add as many expense rows as you need.</p>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {costLines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_130px_36px] gap-2">
                <input value={line.vendor} onChange={(e) => setCostLines((current) => current.map((item) => item.id === line.id ? { ...item, vendor: e.target.value } : item))} placeholder="Expense name — employee, software, travel…" aria-label={`Expense name ${index + 1}`} className="rounded-lg border border-white/10 bg-[#11100d] px-3 py-2.5 text-sm text-white"/>
                <input type="number" min="0" step="0.01" value={line.amount || ""} onChange={(e) => setCostLines((current) => current.map((item) => item.id === line.id ? { ...item, amount: Number(e.target.value) } : item))} placeholder="Amount" aria-label={`Expense amount ${index + 1}`} className="rounded-lg border border-white/10 bg-[#11100d] px-3 py-2.5 text-sm text-white"/>
                <button type="button" onClick={() => setCostLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remove expense ${index + 1}`} className="rounded-lg text-red-300 hover:bg-red-500/10">×</button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setCostLines((current) => [...current, newCostLine("Other", new Date().toISOString().slice(0, 10))])} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300">+ Add expense</button>
            <p className="text-sm text-gray-400">New expenses: <strong className="text-amber-200">{money(newCostTotal)}</strong></p>
          </div>
          <div className={`rounded-xl border p-4 ${projectRevenue <= 0 ? "border-gray-500/20 bg-white/[0.03]" : projectedProjectProfit > 0 ? "border-green-500/25 bg-green-500/[0.07]" : projectedProjectProfit < 0 ? "border-red-500/25 bg-red-500/[0.07]" : "border-amber-300/25 bg-amber-300/[0.06]"}`}>
            <p className="text-xs uppercase tracking-wider text-gray-500">Projected result after these expenses</p>
            {projectRevenue <= 0 ? <p className="mt-2 font-semibold text-gray-300">Revenue is not recorded yet, so profit or loss cannot be calculated.</p> : <>
              <p className={`mt-2 text-xl font-bold ${projectedProjectProfit > 0 ? "text-green-300" : projectedProjectProfit < 0 ? "text-red-300" : "text-amber-200"}`}>{projectedProjectProfit > 0 ? `Profitable · ${money(projectedProjectProfit)} profit` : projectedProjectProfit < 0 ? `Loss-making · ${money(Math.abs(projectedProjectProfit))} loss` : "Break-even"}</p>
              <p className="mt-1 text-xs text-gray-500">Revenue {money(projectRevenue)} − total costs {money(existingProjectCosts + newCostTotal)}</p>
            </>}
          </div>
          <button disabled={submitting || !costLines.some((line) => line.amount > 0)} className="w-full rounded-lg bg-amber-300 py-3 font-bold text-black disabled:opacity-50">{submitting ? "Saving expenses..." : "Save all expenses"}</button>
        </form>
      </Modal>

      <Modal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} title="Add Milestone">
        <form onSubmit={saveMilestone} className="space-y-4">
          <FormInput label="Milestone Title *" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} required />
          <FormTextarea label="Description" rows={3} value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput label="Due Date" type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} />
            <FormSelect label="Status" value={milestoneForm.status} onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value as MilestoneStatus })} options={MILESTONE_STATUSES.map((status) => ({ value: status, label: status }))} />
          </div>
          <FormInput label="Amount" type="number" min="0" step="0.01" value={milestoneForm.amount} onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: Number(e.target.value) })} />
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-amber-300 py-2 font-semibold text-black hover:bg-amber-400 disabled:bg-amber-300/50">
            {submitting ? "Saving..." : "Save Milestone"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
