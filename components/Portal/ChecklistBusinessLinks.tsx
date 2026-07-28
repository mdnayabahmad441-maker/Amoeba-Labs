"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ChecklistPriority } from "@/lib/daily-checklist";

type Option = { id: string; label: string; venture_id?: string };
type LinkedItem = {
  id: string; title: string; description?: string | null; priority: ChecklistPriority;
  relatedTaskId: string | null; relatedLeadId: string | null;
  relatedClientId: string | null; relatedProjectId: string | null;
};

export default function ChecklistBusinessLinks({
  item, onClose, onSaved,
}: { item: LinkedItem; onClose: () => void; onSaved: () => void }) {
  const [tasks, setTasks] = useState<Option[]>([]);
  const [leads, setLeads] = useState<Option[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [ventureId, setVentureId] = useState("");
  const [links, setLinks] = useState({
    related_task_id: item.relatedTaskId || "", related_lead_id: item.relatedLeadId || "",
    related_client_id: item.relatedClientId || "", related_project_id: item.relatedProjectId || "",
  });
  const [deadline, setDeadline] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const { data: ventures } = await supabase.from("ventures").select("id").eq("status", "Active").is("archived_at", null).order("is_default", { ascending: false }).limit(1);
      const currentVenture = ventures?.[0]?.id || "";
      setVentureId(currentVenture);
      if (!currentVenture) return;
      const [taskResult, leadResult, clientResult, projectResult, employeeResult] = await Promise.all([
        supabase.from("tasks").select("id,title,venture_id").eq("venture_id", currentVenture).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
        supabase.from("leads").select("id,client_name,venture_id").eq("venture_id", currentVenture).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
        supabase.from("clients").select("id,client_name,venture_id").eq("venture_id", currentVenture).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
        supabase.from("projects").select("id,project_name,venture_id").eq("venture_id", currentVenture).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
        supabase.from("employees").select("id,full_name,venture_id").eq("venture_id", currentVenture).eq("status", "Active").is("archived_at", null).order("full_name"),
      ]);
      setTasks((taskResult.data || []).map((row) => ({ id: row.id, label: row.title, venture_id: row.venture_id })));
      setLeads((leadResult.data || []).map((row) => ({ id: row.id, label: row.client_name, venture_id: row.venture_id })));
      setClients((clientResult.data || []).map((row) => ({ id: row.id, label: row.client_name, venture_id: row.venture_id })));
      setProjects((projectResult.data || []).map((row) => ({ id: row.id, label: row.project_name, venture_id: row.venture_id })));
      setEmployees((employeeResult.data || []).map((row) => ({ id: row.id, label: row.full_name, venture_id: row.venture_id })));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveLinks() {
    setSaving(true); setError("");
    const payload = Object.fromEntries(Object.entries(links).map(([key, value]) => [key, value || null]));
    const { error: saveError } = await supabase.from("daily_checklist_items").update(payload).eq("id", item.id);
    setSaving(false);
    if (saveError) setError(saveError.message); else { onSaved(); onClose(); }
  }

  async function convertToTask() {
    if (!ventureId || !deadline || !window.confirm("Create a Task from this checklist item? The original checklist item will remain.")) return;
    setSaving(true); setError("");
    const taskPriority = item.priority === "Critical" ? "Urgent" : item.priority === "Important" ? "High" : "Low";
    const { data, error: taskError } = await supabase.from("tasks").insert({
      venture_id: ventureId, title: item.title, description: item.description || null,
      due_date: deadline, priority: taskPriority, status: "To Do",
      assigned_employee_id: assignee || null,
      related_client_id: links.related_client_id || null, related_lead_id: links.related_lead_id || null,
    }).select("id").single();
    if (taskError) { setError(taskError.message); setSaving(false); return; }
    const { error: linkError } = await supabase.from("daily_checklist_items").update({ related_task_id: data.id }).eq("id", item.id);
    setSaving(false);
    if (linkError) setError(linkError.message); else { onSaved(); onClose(); }
  }

  const fields: Array<[keyof typeof links, string, Option[]]> = [
    ["related_task_id", "Task", tasks], ["related_lead_id", "Lead", leads],
    ["related_client_id", "Client", clients], ["related_project_id", "Project", projects],
  ];
  return <div role="dialog" aria-modal="true" aria-labelledby="business-links-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-amber-300/20 bg-[#11100d] p-5">
      <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wider text-amber-300">Business links</p><h2 id="business-links-title" className="mt-1 text-lg font-bold text-white">{item.title}</h2></div><button onClick={onClose} aria-label="Close business links" className="p-2 text-gray-400">×</button></div>
      {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([field, label, options]) => <label key={field} className="text-sm text-gray-400">{label}<select value={links[field]} onChange={(event) => setLinks((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#17150f] p-2.5 text-white"><option value="">Not linked</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}</div>
      <button disabled={saving} onClick={saveLinks} className="mt-4 w-full rounded-xl bg-amber-300 py-2.5 font-bold text-black disabled:opacity-40">Save links</button>
      <div className="mt-6 border-t border-white/8 pt-5"><h3 className="font-semibold text-white">Convert to Task</h3><p className="mt-1 text-xs text-gray-500">Creates a separate operational Task and keeps this checklist history.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm text-gray-400">Deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#17150f] p-2.5 text-white" /></label><label className="text-sm text-gray-400">Assignee<select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#17150f] p-2.5 text-white"><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</select></label></div><button disabled={saving} onClick={convertToTask} className="mt-3 rounded-xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Create Task</button></div>
      <div className="mt-5 flex flex-wrap gap-2">{item.relatedTaskId && <Link href="/portal/tasks" className="text-xs text-amber-200">Open linked Task →</Link>}{item.relatedLeadId && <Link href="/portal/leads" className="text-xs text-amber-200">Open linked Lead →</Link>}{item.relatedClientId && <Link href="/portal/clients" className="text-xs text-amber-200">Open linked Client →</Link>}{item.relatedProjectId && <Link href="/portal/projects" className="text-xs text-amber-200">Open linked Project →</Link>}</div>
    </div>
  </div>;
}
