"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Employee, Task, TodayActionItem, TodayRecordType, Venture } from "@/lib/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/Portal/States";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";

type Priority = Task["priority"];

interface CommandItem {
  key: string;
  sourceId: string;
  ventureId: string;
  recordType: TodayRecordType;
  group: string;
  title: string;
  detail: string;
  actionDate: string;
  deadline: string | null;
  priority: Priority;
  status: string;
  employeeId: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  href: string;
  canCompleteSource: boolean;
  sourceTable?: "tasks" | "followups";
  override?: TodayActionItem;
}

interface EditForm {
  action_date: string;
  assigned_employee_id: string;
  priority: Priority;
  notes: string;
}

interface AddForm extends EditForm {
  venture_id: string;
  record_type: "Meeting" | "Field Visit" | "Client Update" | "Renewal" | "Content" | "Other";
  title: string;
  description: string;
  phone: string;
  email: string;
}

const today = () => new Date().toISOString().split("T")[0];
const addDays = (days: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().split("T")[0];
};

const priorityRank: Record<Priority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
const priorityStyle: Record<Priority, string> = {
  Urgent: "border-red-500/30 bg-red-500/10 text-red-300",
  High: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  Medium: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  Low: "border-green-500/30 bg-green-500/10 text-green-300",
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export default function TodayPage() {
  const [items, setItems] = useState<CommandItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [selected, setSelected] = useState<CommandItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ action_date: today(), assigned_employee_id: "", priority: "Medium", notes: "" });
  const [addForm, setAddForm] = useState<AddForm>({ venture_id: "", record_type: "Meeting", title: "", description: "", action_date: today(), assigned_employee_id: "", priority: "Medium", notes: "", phone: "", email: "" });
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [ventureFilter, setVentureFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ventureResult = await supabase.from("ventures").select("*").is("archived_at", null).order("is_default", { ascending: false }).order("venture_name");
      if (ventureResult.error) throw ventureResult.error;
      const ventureRows = (ventureResult.data || []) as Venture[];
      setVentures(ventureRows);
      const ventureIds = ventureRows.map((venture) => venture.id);
      if (!ventureIds.length) {
        setItems([]);
        return;
      }

      const [employeeResult, clientResult, leadResult, taskResult, followupResult, proposalResult, invoiceResult, projectResult, calendarResult, overrideResult, recurringResult, fieldVisitResult] = await Promise.all([
        supabase.from("employees").select("*").in("venture_id", ventureIds).eq("status", "Active").is("archived_at", null).order("full_name"),
        supabase.from("clients").select("id, venture_id, client_name, phone, email, status, next_action_type, next_action_at, responsible_employee_id, follow_up_priority, last_contact_at, client_update_due_at, updated_at").in("venture_id", ventureIds).is("archived_at", null),
        supabase.from("leads").select("id, venture_id, client_name, phone, email, pipeline_stage, lead_temperature, recommended_next_action, next_follow_up, next_action_type, next_action_at, responsible_employee_id, follow_up_priority").in("venture_id", ventureIds).is("archived_at", null),
        supabase.from("tasks").select("*").in("venture_id", ventureIds).is("archived_at", null).neq("status", "Done").neq("status", "Cancelled"),
        supabase.from("followups").select("*").in("venture_id", ventureIds).is("archived_at", null).neq("status", "Done"),
        supabase.from("proposals").select("*").in("venture_id", ventureIds).is("archived_at", null).in("status", ["Sent", "Draft"]),
        supabase.from("invoices").select("*").in("venture_id", ventureIds).is("archived_at", null).not("status", "in", "(Paid,Cancelled,Draft)"),
        supabase.from("projects").select("*").in("venture_id", ventureIds).is("archived_at", null).in("status", ["Awaiting Agreement", "Awaiting Deposit", "Awaiting Requirements", "Ready to Start", "Active", "Client Review", "On Hold"]),
        supabase.from("calendar_events").select("*").in("venture_id", ventureIds).gte("start_at", `${today()}T00:00:00+05:30`).lt("start_at", `${addDays(1)}T00:00:00+05:30`).in("status", ["Scheduled", "Confirmed"]),
        supabase.from("today_action_items").select("*").in("venture_id", ventureIds),
        supabase.from("recurring_services").select("*").in("venture_id", ventureIds).eq("status", "Active").is("archived_at", null).or(`next_billing_date.lte.${addDays(7)},renewal_date.lte.${addDays(30)}`),
        supabase.from("field_visits").select("*").in("venture_id", ventureIds).is("archived_at", null).in("status", ["Planned","Confirmed","Reschedule required"]).lte("appointment_at", `${addDays(1)}T23:59:59+05:30`),
      ]);

      // Calendar is an optional Phase 4 dependency until its migration is applied.
      // Today must continue working with the already-applied Phase 1-3 schema.
      const requiredResults = [employeeResult, clientResult, leadResult, taskResult, followupResult, proposalResult, invoiceResult, projectResult];
      const failed = requiredResults.find((result) => result.error);
      if (failed?.error) throw failed.error;

      setMigrationMissing(Boolean(overrideResult.error));
      const employeeRows = (employeeResult.data || []) as Employee[];
      setEmployees(employeeRows);
      const employeeMap = new Map(employeeRows.map((employee) => [employee.id, employee]));
      const clients = clientResult.data || [];
      const leads = leadResult.data || [];
      const clientMap = new Map(clients.map((client) => [client.id, client]));
      const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
      const overrides = overrideResult.error ? [] : ((overrideResult.data || []) as TodayActionItem[]);
      setCompletedToday(overrides.filter((item) => item.status === "Completed" && item.completed_at?.startsWith(today())).length);
      const overrideMap = new Map(overrides.filter((item) => item.source_record_id).map((item) => [`${item.source_record_type}:${item.source_record_id}`, item]));
      const result: CommandItem[] = [];

      const applyOverride = (item: CommandItem) => {
        const override = overrideMap.get(`${item.recordType}:${item.sourceId}`);
        if (!override || override.status === "Completed" || override.status === "Cancelled") return override ? null : item;
        return {
          ...item,
          actionDate: override.action_date || item.actionDate,
          deadline: override.deadline || item.deadline,
          priority: override.priority || item.priority,
          status: override.status || item.status,
          employeeId: override.assigned_employee_id || item.employeeId,
          department: override.department || item.department,
          override,
        };
      };

      for (const row of taskResult.data || []) {
        if (row.due_date > today()) continue;
        const employee = row.assigned_employee_id ? employeeMap.get(row.assigned_employee_id) : undefined;
        const related = row.related_client_id ? clientMap.get(row.related_client_id) : row.related_lead_id ? leadMap.get(row.related_lead_id) : undefined;
        const item = applyOverride({ key: `Task:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Task", group: row.due_date < today() ? "Overdue tasks" : "Tasks due today", title: row.title, detail: text(row.description, "Task requires action"), actionDate: row.due_date, deadline: row.due_date, priority: row.priority, status: row.status, employeeId: row.assigned_employee_id, department: employee?.department || null, phone: row.assigned_to_phone || related?.phone || null, email: related?.email || null, href: "/portal/tasks", canCompleteSource: true, sourceTable: "tasks" });
        if (item) result.push(item);
      }

      for (const row of followupResult.data || []) {
        if (row.follow_up_date > today()) continue;
        const related = row.client_id ? clientMap.get(row.client_id) : leadMap.get(row.lead_id);
        const item = applyOverride({ key: `Follow-up:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Follow-up", group: row.follow_up_date < today() || row.status === "Overdue" ? "Overdue follow-ups" : row.type === "Meeting" ? "Meetings and field visits" : "Follow-ups due today", title: related?.client_name || "Follow-up", detail: `${row.type}${row.notes ? ` · ${row.notes}` : ""}`, actionDate: row.follow_up_date, deadline: row.follow_up_date, priority: row.status === "Overdue" ? "Urgent" : "High", status: row.status, employeeId: null, department: null, phone: related?.phone || null, email: related?.email || null, href: "/portal/followups", canCompleteSource: true, sourceTable: "followups" });
        if (item) result.push(item);
      }

      for (const row of calendarResult.error ? [] : (calendarResult.data || [])) {
        const related = row.related_client_id ? clientMap.get(row.related_client_id) : row.related_lead_id ? leadMap.get(row.related_lead_id) : undefined;
        const employee = row.assigned_employee_id ? employeeMap.get(row.assigned_employee_id) : undefined;
        const recordType: TodayRecordType = row.event_type === "Field visit" ? "Field Visit" : row.event_type.includes("meeting") || ["Discovery call", "Demonstration"].includes(row.event_type) ? "Meeting" : "Other";
        const item = applyOverride({ key: `Calendar:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType, group: row.event_type === "Content recording" ? "Content scheduled today" : "Meetings and field visits", title: row.title, detail: `${row.event_type} · ${new Date(row.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}${row.location ? ` · ${row.location}` : ""}`, actionDate: row.start_at.slice(0, 10), deadline: row.end_at.slice(0, 10), priority: row.priority, status: row.status, employeeId: row.assigned_employee_id, department: employee?.department || null, phone: related?.phone || null, email: related?.email || null, href: "/portal/calendar", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const row of fieldVisitResult.error ? [] : (fieldVisitResult.data || [])) {
        const item = applyOverride({ key: `Field Visit:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Field Visit", group: row.appointment_at.slice(0,10) < today() ? "Overdue field visits" : "Meetings and field visits", title: row.business_name, detail: `${row.town} · ${row.visit_purpose}`, actionDate: row.appointment_at.slice(0,10), deadline: row.appointment_at.slice(0,10), priority: row.status === "Reschedule required" ? "High" : "Medium", status: row.status, employeeId: null, department: "Sales", phone: row.phone, email: null, href: "/portal/field-visits", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const row of proposalResult.data || []) {
        const expiring = row.valid_until && row.valid_until <= addDays(7);
        if (row.status !== "Sent" && !expiring) continue;
        const related = row.client_id ? clientMap.get(row.client_id) : leadMap.get(row.lead_id);
        const item = applyOverride({ key: `Proposal:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Proposal", group: expiring ? "Proposals approaching expiry" : "Proposals awaiting response", title: row.title, detail: `${row.proposal_number} · ${related?.client_name || "Unlinked contact"}`, actionDate: row.valid_until || today(), deadline: row.valid_until, priority: expiring ? "High" : "Medium", status: row.status, employeeId: null, department: "Sales", phone: related?.phone || null, email: related?.email || null, href: "/portal/proposals", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const row of invoiceResult.data || []) {
        if (row.due_date > addDays(7)) continue;
        const related = clientMap.get(row.client_id);
        const overdue = row.due_date < today() || row.status === "Overdue";
        const item = applyOverride({ key: `Invoice:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Invoice", group: overdue ? "Overdue invoices" : "Invoices due soon", title: `${row.invoice_number} · ${related?.client_name || "Client"}`, detail: `₹${Number(row.amount || 0).toLocaleString("en-IN")} outstanding invoice`, actionDate: row.due_date, deadline: row.due_date, priority: overdue ? "Urgent" : "High", status: overdue ? "Overdue" : row.status, employeeId: null, department: "Accounts", phone: related?.phone || null, email: related?.email || null, href: "/portal/billing", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const row of recurringResult.error ? [] : (recurringResult.data || [])) {
        const related = clientMap.get(row.client_id);
        const billingDue = row.next_billing_date <= addDays(7);
        const actionDate = billingDue ? row.next_billing_date : row.renewal_date;
        if (!actionDate) continue;
        const item = applyOverride({ key: `Renewal:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Renewal", group: billingDue ? "Recurring billing due soon" : "Renewals approaching", title: `${row.product_service} · ${related?.client_name || "Client"}`, detail: billingDue ? `Review invoice draft before ${new Date(row.next_billing_date).toLocaleDateString("en-IN")}` : `Renewal due ${new Date(row.renewal_date).toLocaleDateString("en-IN")}`, actionDate, deadline: actionDate, priority: billingDue && row.next_billing_date <= today() ? "High" : "Medium", status: "Needs review", employeeId: null, department: "Accounts", phone: related?.phone || null, email: related?.email || null, href: "/portal/billing/recurring", canCompleteSource: false });
        if (item) result.push(item);
      }

      const projects = projectResult.data || [];
      const projectIds = projects.map((project) => project.id);
      const milestoneResult = projectIds.length ? await supabase.from("project_milestones").select("*").in("project_id", projectIds).neq("status", "Done") : { data: [], error: null };
      if (milestoneResult.error) throw milestoneResult.error;
      const projectMap = new Map(projects.map((project) => [project.id, project]));

      for (const row of projects) {
        if (!row.due_date || row.due_date >= today()) continue;
        const item = applyOverride({ key: `Project:${row.id}`, sourceId: row.id, ventureId: row.venture_id, recordType: "Project", group: "Projects at risk", title: row.project_name, detail: `${row.status} · deadline missed`, actionDate: row.due_date, deadline: row.due_date, priority: "Urgent", status: row.status, employeeId: null, department: "Delivery", phone: null, email: null, href: "/portal/projects", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const row of milestoneResult.data || []) {
        if (!row.due_date || row.due_date >= today()) continue;
        const project = projectMap.get(row.project_id);
        if (!project) continue;
        const item = applyOverride({ key: `Milestone:${row.id}`, sourceId: row.id, ventureId: project.venture_id, recordType: "Milestone", group: "Delayed milestones", title: row.title, detail: project.project_name, actionDate: row.due_date, deadline: row.due_date, priority: row.status === "Blocked" ? "Urgent" : "High", status: row.status, employeeId: null, department: "Delivery", phone: null, email: null, href: "/portal/projects", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const lead of leads) {
        if (["Won", "Lost"].includes(lead.pipeline_stage) || (lead.next_action_at && lead.next_action_at > new Date().toISOString())) continue;
        const employee = lead.responsible_employee_id ? employeeMap.get(lead.responsible_employee_id) : undefined;
        const temperaturePriority = lead.lead_temperature === "Hot" ? "Urgent" : lead.lead_temperature === "Warm" ? "High" : lead.follow_up_priority || "Medium";
        const item = applyOverride({ key: `Lead:${lead.id}`, sourceId: lead.id, ventureId: lead.venture_id, recordType: "Lead", group: "Leads without a next action", title: lead.client_name, detail: `${lead.pipeline_stage} · ${lead.lead_temperature} · ${lead.recommended_next_action || (lead.next_action_at ? "missed next action" : "no future next action")}`, actionDate: lead.next_action_at?.slice(0, 10) || today(), deadline: null, priority: temperaturePriority, status: "Needs action", employeeId: lead.responsible_employee_id || null, department: employee?.department || "Sales", phone: lead.phone || null, email: lead.email || null, href: "/portal/leads", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const client of clients) {
        if (client.status !== "Active") continue;
        const updateDue = client.client_update_due_at ? client.client_update_due_at.slice(0, 10) <= today() : false;
        const missedAction = client.next_action_at ? client.next_action_at <= new Date().toISOString() : true;
        if (!updateDue && !missedAction) continue;
        const employee = client.responsible_employee_id ? employeeMap.get(client.responsible_employee_id) : undefined;
        const item = applyOverride({ key: `Client Update:${client.id}`, sourceId: client.id, ventureId: client.venture_id, recordType: "Client Update", group: "Clients awaiting an update", title: client.client_name, detail: updateDue ? "Scheduled client update is due" : client.next_action_at ? "Missed client next action" : "No future next action", actionDate: client.client_update_due_at?.slice(0, 10) || client.next_action_at?.slice(0, 10) || today(), deadline: client.client_update_due_at?.slice(0, 10) || null, priority: client.follow_up_priority || "High", status: "Needs update", employeeId: client.responsible_employee_id || null, department: employee?.department || null, phone: client.phone || null, email: client.email || null, href: "/portal/clients", canCompleteSource: false });
        if (item) result.push(item);
      }

      for (const action of overrides.filter((item) => !item.source_record_id && !["Completed", "Cancelled"].includes(item.status))) {
        if (action.action_date > today()) continue;
        result.push({ key: `Today:${action.id}`, sourceId: action.id, ventureId: action.venture_id, recordType: action.record_type, group: action.record_type === "Meeting" || action.record_type === "Field Visit" ? "Meetings and field visits" : action.record_type === "Client Update" ? "Clients awaiting an update" : action.record_type === "Renewal" ? "Renewals approaching" : action.record_type === "Content" ? "Content scheduled today" : "Other actions", title: action.title, detail: action.description || action.notes || "Daily action", actionDate: action.action_date, deadline: action.deadline, priority: action.priority, status: action.status, employeeId: action.assigned_employee_id, department: action.department, phone: action.phone, email: action.email, href: "/portal/today", canCompleteSource: false, override: action });
      }

      result.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || a.actionDate.localeCompare(b.actionDate));
      setItems(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the Today command centre.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department).filter(Boolean) as string[])].sort(), [employees]);
  const visibleItems = items.filter((item) => (!employeeFilter || item.employeeId === employeeFilter) && (!ventureFilter || item.ventureId === ventureFilter) && (!departmentFilter || item.department === departmentFilter) && (!typeFilter || item.recordType === typeFilter) && (!priorityFilter || item.priority === priorityFilter) && (!statusFilter || item.status === statusFilter));
  const grouped = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    visibleItems.forEach((item) => groups.set(item.group, [...(groups.get(item.group) || []), item]));
    return groups;
  }, [visibleItems]);
  async function audit(item: CommandItem, action: string, details: Record<string, unknown> = {}) {
    const { error: auditError } = await supabase.from("activity_logs").insert([{ venture_id: item.ventureId, record_type: item.recordType, record_id: item.sourceId, action, details }]);
    if (auditError) throw auditError;
  }

  async function saveOverride(item: CommandItem, changes: Partial<TodayActionItem>) {
    const employee = changes.assigned_employee_id ? employees.find((person) => person.id === changes.assigned_employee_id) : undefined;
    const payload = {
      venture_id: item.ventureId, record_type: item.recordType, source_record_type: item.recordType, source_record_id: item.sourceId,
      title: item.title, description: item.detail, action_date: changes.action_date || item.actionDate || today(), deadline: item.deadline,
      priority: changes.priority || item.priority, status: changes.status || "Pending", assigned_employee_id: changes.assigned_employee_id ?? item.employeeId,
      department: employee?.department || item.department, phone: item.phone, email: item.email, notes: changes.notes ?? item.override?.notes ?? null,
      completed_at: changes.status === "Completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from("today_action_items").upsert(payload, { onConflict: "venture_id,source_record_type,source_record_id" });
    if (saveError) throw saveError;
  }

  async function complete(item: CommandItem) {
    if (migrationMissing) { setError("Run TODAY_COMMAND_CENTRE_UPGRADE.sql before using quick actions."); return; }
    setSaving(true); setError("");
    try {
      if (item.canCompleteSource && item.sourceTable) {
        const status = item.sourceTable === "tasks" ? "Done" : "Done";
        const { error: updateError } = await supabase.from(item.sourceTable).update({ status }).eq("id", item.sourceId).eq("venture_id", item.ventureId);
        if (updateError) throw updateError;
      }
      await saveOverride(item, { status: "Completed" });
      await audit(item, "completed_from_today");
      setNotice(`${item.title} marked complete.`);
      await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to complete action."); }
    finally { setSaving(false); }
  }

  function edit(item: CommandItem) {
    setSelected(item);
    setEditForm({ action_date: item.actionDate || today(), assigned_employee_id: item.employeeId || "", priority: item.priority, notes: item.override?.notes || "" });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (migrationMissing) { setError("Run TODAY_COMMAND_CENTRE_UPGRADE.sql before using quick actions."); return; }
    setSaving(true); setError("");
    try {
      await saveOverride(selected, editForm);
      await audit(selected, "updated_from_today", { ...editForm });
      setSelected(null);
      setNotice(`${selected.title} updated.`);
      await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update action."); }
    finally { setSaving(false); }
  }

  function openAdd() {
    const venture = ventures.find((item) => item.is_default) || ventures.find((item) => item.status === "Active") || ventures[0];
    const founder = employees.find((employee) => employee.venture_id === venture?.id && employee.is_founder);
    setAddForm({ venture_id: venture?.id || "", record_type: "Meeting", title: "", description: "", action_date: today(), assigned_employee_id: founder?.id || "", priority: "Medium", notes: "", phone: "", email: "" });
    setShowAdd(true);
  }

  async function createAction(event: React.FormEvent) {
    event.preventDefault();
    if (migrationMissing) { setError("Run TODAY_COMMAND_CENTRE_UPGRADE.sql before adding daily actions."); return; }
    if (!addForm.venture_id || !addForm.title.trim()) { setError("Venture and title are required."); return; }
    setSaving(true); setError("");
    try {
      const employee = employees.find((person) => person.id === addForm.assigned_employee_id);
      const { data, error: insertError } = await supabase.from("today_action_items").insert([{ venture_id: addForm.venture_id, record_type: addForm.record_type, title: addForm.title.trim(), description: addForm.description.trim() || null, action_date: addForm.action_date, priority: addForm.priority, status: "Pending", assigned_employee_id: addForm.assigned_employee_id || null, department: employee?.department || null, notes: addForm.notes.trim() || null, phone: addForm.phone.trim() || null, email: addForm.email.trim() || null }]).select("id").single();
      if (insertError) throw insertError;
      const { error: auditError } = await supabase.from("activity_logs").insert([{ venture_id: addForm.venture_id, record_type: addForm.record_type, record_id: data.id, action: "created_from_today", details: { title: addForm.title, action_date: addForm.action_date, priority: addForm.priority } }]);
      if (auditError) throw auditError;
      setShowAdd(false); setNotice(`${addForm.title} added to Today.`); await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add daily action."); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/70">Daily command centre</p><h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Today</h1><p className="mt-1 text-sm text-gray-400">The next actions that need attention across the business.</p></div>
        <div className="flex items-stretch gap-3"><button onClick={openAdd} className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black hover:bg-amber-200">+ Add action</button><div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3"><p className="text-xs uppercase tracking-wider text-green-300/70">Completed today</p><p className="text-2xl font-bold text-green-300">{completedToday}</p></div></div>
      </div>

      {migrationMissing && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Run <code>TODAY_COMMAND_CENTRE_UPGRADE.sql</code> in Supabase to enable audited quick actions and manual daily records.</div>}
      {error && <ErrorState message={error} />}
      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{notice}</div>}

      <div className="grid gap-3 rounded-2xl border border-amber-300/10 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <FormSelect value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} placeholder="All employees" options={employees.map((employee) => ({ value: employee.id, label: employee.full_name }))} />
        <FormSelect value={ventureFilter} onChange={(event) => setVentureFilter(event.target.value)} placeholder="All ventures" options={ventures.map((venture) => ({ value: venture.id, label: venture.venture_name }))} />
        <FormSelect value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} placeholder="All departments" options={departments.map((department) => ({ value: department, label: department }))} />
        <FormSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} placeholder="All record types" options={[...new Set(items.map((item) => item.recordType))].map((type) => ({ value: type, label: type }))} />
        <FormSelect value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} placeholder="All priorities" options={["Urgent", "High", "Medium", "Low"].map((priority) => ({ value: priority, label: priority }))} />
        <FormSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} placeholder="All statuses" options={[...new Set(items.map((item) => item.status))].map((status) => ({ value: status, label: status }))} />
      </div>

      {visibleItems.length === 0 ? <EmptyState icon="☀️" title="You are clear for today" description="No records match the current filters." /> : (
        <div className="space-y-6">{[...grouped.entries()].map(([group, groupItems]) => (
          <section key={group} className="space-y-3"><div className="flex items-center gap-3"><h2 className="text-lg font-bold text-white">{group}</h2><span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-gray-400">{groupItems.length}</span></div>
            <div className="grid gap-3 xl:grid-cols-2">{groupItems.map((item) => (
              <article key={item.key} className="rounded-2xl border border-amber-300/10 bg-black/25 p-4 transition hover:border-amber-300/25">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium uppercase tracking-wider text-gray-500">{item.recordType}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityStyle[item.priority]}`}>{item.priority}</span></div><h3 className="mt-2 truncate font-semibold text-white">{item.title}</h3><p className="mt-1 text-sm text-gray-400">{item.detail}</p></div><div className="shrink-0 text-left sm:text-right"><p className={`text-sm font-semibold ${item.actionDate < today() ? "text-red-300" : "text-amber-200"}`}>{item.actionDate < today() ? "Overdue · " : ""}{new Date(`${item.actionDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p><p className="mt-1 text-xs text-gray-500">{item.status}</p></div></div>
                {item.override?.notes && <p className="mt-3 rounded-lg bg-white/5 p-2 text-xs text-gray-300">Note: {item.override.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} onClick={() => complete(item)} className="rounded-lg bg-green-500/15 px-3 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/25 disabled:opacity-50">Mark complete</button><button onClick={() => edit(item)} className="rounded-lg bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/20">Reschedule / assign</button><Link href={item.href} className="rounded-lg bg-white/8 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/12">Open record</Link>{item.phone && <a href={`https://wa.me/${item.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, following up regarding ${item.title}.`)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300">WhatsApp draft</a>}{item.email && <a href={`mailto:${item.email}?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(`Hi,\n\nFollowing up regarding ${item.title}.\n\nRegards,\nGroenics`)}`} className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300">Email draft</a>}</div>
              </article>
            ))}</div>
          </section>
        ))}</div>
      )}

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Update daily action"><form onSubmit={saveEdit} className="space-y-4"><FormInput label="Next action date" type="date" required value={editForm.action_date} onChange={(event) => setEditForm({ ...editForm, action_date: event.target.value })} /><FormSelect label="Responsible employee" value={editForm.assigned_employee_id} onChange={(event) => setEditForm({ ...editForm, assigned_employee_id: event.target.value })} placeholder="Unassigned" options={employees.filter((employee) => !selected || employee.venture_id === selected.ventureId).map((employee) => ({ value: employee.id, label: employee.full_name }))} /><FormSelect label="Priority" required value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value as Priority })} options={["Low", "Medium", "High", "Urgent"].map((priority) => ({ value: priority, label: priority }))} /><FormTextarea label="Internal notes" rows={4} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} placeholder="Add context for the next action" /><div className="flex gap-3"><button disabled={saving} type="submit" className="flex-1 rounded-lg bg-amber-300 py-2.5 font-semibold text-black disabled:opacity-50">{saving ? "Saving..." : "Save update"}</button><button type="button" onClick={() => setSelected(null)} className="flex-1 rounded-lg bg-white/10 py-2.5 font-semibold text-white">Cancel</button></div></form></Modal>
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add daily action"><form onSubmit={createAction} className="space-y-4"><FormSelect label="Venture" required value={addForm.venture_id} onChange={(event) => setAddForm({ ...addForm, venture_id: event.target.value, assigned_employee_id: "" })} options={ventures.map((venture) => ({ value: venture.id, label: venture.venture_name }))} /><FormSelect label="Action type" required value={addForm.record_type} onChange={(event) => setAddForm({ ...addForm, record_type: event.target.value as AddForm["record_type"] })} options={["Meeting", "Field Visit", "Client Update", "Renewal", "Content", "Other"].map((type) => ({ value: type, label: type }))} /><FormInput label="Title" required maxLength={160} value={addForm.title} onChange={(event) => setAddForm({ ...addForm, title: event.target.value })} placeholder="What needs to happen?" /><FormTextarea label="Description" rows={3} value={addForm.description} onChange={(event) => setAddForm({ ...addForm, description: event.target.value })} /><div className="grid gap-4 sm:grid-cols-2"><FormInput label="Action date" type="date" required value={addForm.action_date} onChange={(event) => setAddForm({ ...addForm, action_date: event.target.value })} /><FormSelect label="Priority" required value={addForm.priority} onChange={(event) => setAddForm({ ...addForm, priority: event.target.value as Priority })} options={["Low", "Medium", "High", "Urgent"].map((priority) => ({ value: priority, label: priority }))} /></div><FormSelect label="Responsible employee" value={addForm.assigned_employee_id} onChange={(event) => setAddForm({ ...addForm, assigned_employee_id: event.target.value })} placeholder="Unassigned" options={employees.filter((employee) => employee.venture_id === addForm.venture_id).map((employee) => ({ value: employee.id, label: employee.full_name }))} /><div className="grid gap-4 sm:grid-cols-2"><FormInput label="Phone / WhatsApp" value={addForm.phone} onChange={(event) => setAddForm({ ...addForm, phone: event.target.value })} /><FormInput label="Email" type="email" value={addForm.email} onChange={(event) => setAddForm({ ...addForm, email: event.target.value })} /></div><FormTextarea label="Internal notes" rows={3} value={addForm.notes} onChange={(event) => setAddForm({ ...addForm, notes: event.target.value })} /><div className="flex gap-3"><button disabled={saving} type="submit" className="flex-1 rounded-lg bg-amber-300 py-2.5 font-semibold text-black disabled:opacity-50">{saving ? "Adding..." : "Add action"}</button><button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-lg bg-white/10 py-2.5 font-semibold text-white">Cancel</button></div></form></Modal>
    </div>
  );
}
