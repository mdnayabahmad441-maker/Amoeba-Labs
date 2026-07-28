import { Client, Lead } from "./types";

export interface NextActionThresholds {
  noContactDays: number;
  stuckLeadDays: number;
  clientUpdateDays: number;
}

export interface NextActionWarning {
  code: "missing" | "missed" | "no-contact" | "rescheduled" | "stuck" | "client-update";
  label: string;
  severity: "warning" | "danger";
}

const millisecondsPerDay = 86_400_000;

export function daysSince(value: string | null | undefined) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / millisecondsPerDay));
}

export function nextActionWarnings(record: Lead | Client, thresholds: NextActionThresholds): NextActionWarning[] {
  const warnings: NextActionWarning[] = [];
  const isLead = "pipeline_stage" in record;
  const active = isLead ? !["Won", "Lost"].includes(record.pipeline_stage) : ["Lead", "Active"].includes(record.status);
  if (!active) return warnings;
  if (!record.next_action_at || new Date(record.next_action_at).getTime() <= Date.now()) {
    warnings.push(record.next_action_at ? { code: "missed", label: "Missed next action", severity: "danger" } : { code: "missing", label: "No future next action", severity: "danger" });
  }
  const inactiveDays = daysSince(record.last_contact_at || record.created_at);
  if (inactiveDays !== null && inactiveDays >= thresholds.noContactDays) warnings.push({ code: "no-contact", label: `No contact for ${inactiveDays} days`, severity: "warning" });
  if (record.next_action_reschedule_count >= 3) warnings.push({ code: "rescheduled", label: `Rescheduled ${record.next_action_reschedule_count} times`, severity: "warning" });
  if (isLead) {
    const stuckDays = daysSince(record.pipeline_stage_updated_at || record.stage_entered_at);
    if (stuckDays !== null && stuckDays >= thresholds.stuckLeadDays) warnings.push({ code: "stuck", label: `Stage unchanged for ${stuckDays} days`, severity: "warning" });
  } else {
    const updateDays = daysSince(record.last_contact_at || record.updated_at);
    if (record.status === "Active" && updateDays !== null && updateDays >= thresholds.clientUpdateDays) warnings.push({ code: "client-update", label: "Client update required", severity: "warning" });
  }
  return warnings;
}

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
