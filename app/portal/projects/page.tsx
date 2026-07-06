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
  PROJECT_STATUSES,
  ProjectStatus,
  Proposal,
} from "@/lib/types";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState, EmptyState } from "@/components/Portal/States";

type ProjectRow = Project & {
  milestones: ProjectMilestone[];
  client_name?: string;
  lead_name?: string;
  proposal_number?: string;
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
  status: "Planning",
  start_date: "",
  due_date: "",
  budget: 0,
  notes: "",
};

const emptyMilestone: MilestoneForm = {
  title: "",
  description: "",
  due_date: "",
  status: "Not Started",
  amount: 0,
};

const money = (value: number | null | undefined) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

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
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(emptyMilestone);

  useEffect(() => {
    loadData();
  }, []);

  const visibleProjects = useMemo(
    () => (filterStatus ? projects.filter((project) => project.status === filterStatus) : projects),
    [filterStatus, projects]
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const { data: ventures } = await supabase.from("ventures").select("id").eq("status", "Active").limit(1);
      if (!ventures || ventures.length === 0) {
        setError("No active venture found.");
        return;
      }

      const activeVentureId = ventures[0].id;
      setVentureId(activeVentureId);

      const [clientsRes, leadsRes, proposalsRes, projectsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("venture_id", activeVentureId).order("client_name"),
        supabase.from("leads").select("*").eq("venture_id", activeVentureId).order("created_at", { ascending: false }),
        supabase.from("proposals").select("*").eq("venture_id", activeVentureId).order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("venture_id", activeVentureId).order("created_at", { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (proposalsRes.error) throw proposalsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const projectRows = (projectsRes.data || []) as Project[];
      const projectIds = projectRows.map((project) => project.id);
      const milestoneRes = projectIds.length
        ? await supabase.from("project_milestones").select("*").in("project_id", projectIds).order("due_date", { ascending: true })
        : { data: [], error: null };

      if (milestoneRes.error) throw milestoneRes.error;

      const clientRows = (clientsRes.data || []) as Client[];
      const leadRows = (leadsRes.data || []) as Lead[];
      const proposalRows = (proposalsRes.data || []) as Proposal[];
      const clientMap = new Map(clientRows.map((client) => [client.id, client.client_name]));
      const leadMap = new Map(leadRows.map((lead) => [lead.id, lead.client_name]));
      const proposalMap = new Map(proposalRows.map((proposal) => [proposal.id, proposal.proposal_number]));
      const milestoneMap = new Map<string, ProjectMilestone[]>();

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
        }))
      );
    } catch (err: any) {
      setError(err.message || "Unable to load projects.");
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
        updated_at: new Date().toISOString(),
      };

      const { error: projectError } = editingId
        ? await supabase.from("projects").update(payload).eq("id", editingId)
        : await supabase.from("projects").insert([payload]);

      if (projectError) throw projectError;

      setShowProjectModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Unable to save project.");
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
    } catch (err: any) {
      setError(err.message || "Unable to save milestone.");
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
    if (!confirm("Delete this project?")) return;
    const { error: deleteError } = await supabase.from("projects").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadData();
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
                <button onClick={() => openMilestone(project)} className="rounded bg-sky-500/15 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/25">
                  + Milestone
                </button>
                <button onClick={() => openEditProject(project)} className="rounded bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15">
                  Edit
                </button>
                <button onClick={() => deleteProject(project.id)} className="rounded bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <FormInput label="Budget" type="number" min="0" step="0.01" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: Number(e.target.value) })} />
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
