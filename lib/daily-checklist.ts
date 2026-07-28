export const CHECKLIST_CATEGORIES = [
  "Faith", "Fitness", "Sales", "Follow-ups", "Client Delivery",
  "Product", "Content", "Learning", "Market Research", "Administration", "Personal",
  "Personal Execution", "Field Visits",
  "Uncategorized",
] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export const CHECKLIST_PRIORITIES = ["Critical", "Important", "Optional"] as const;
export type ChecklistPriority = (typeof CHECKLIST_PRIORITIES)[number];

export const CHECKLIST_STATUSES = ["pending", "done", "not_done", "skipped"] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const MISSED_REASONS = [
  ["lack_of_time", "Lack of time"],
  ["travel_field_visit", "Travel/field visit"],
  ["unexpected_work", "Unexpected work"],
  ["low_energy", "Low energy"],
  ["waiting_for_someone", "Waiting for someone"],
  ["poor_planning", "Poor planning"],
  ["distraction", "Distraction"],
  ["task_too_large", "Task too large"],
  ["other", "Other"],
] as const;

export const CHECKLIST_UNITS = [
  "Count", "Minutes", "Hours", "Litres", "Rupees", "Kilograms", "Grams",
  "Yes/No", "Days", "Clips", "Messages", "Calls", "Meetings", "Demos",
  "Proposals", "Percentage", "Sessions", "Posts", "Custom",
] as const;

export const CHECKLIST_RECURRENCES = [
  "None", "Daily", "Weekly", "Gym Days", "Non Gym Days", "Off Day",
  "Applicable Days", "Closing Days", "Everyday",
  "5-6 days/week", "Recovery day", "Workout days", "Office days",
  "Monday-Saturday", "When qualified", "When deal closes", "Working days",
  "Delivery days", "When received", "3 days/week", "Product days",
  "2 days/week", "Field days", "Research days", "Publishing days",
  "Scheduled days", "4-5 days/week", "4 days/week", "Learning days",
] as const;

export const CATEGORY_STYLE: Record<ChecklistCategory, { icon: string; className: string }> = {
  Faith: { icon: "◐", className: "text-violet-200 bg-violet-400/10 border-violet-400/20" },
  Fitness: { icon: "◇", className: "text-emerald-200 bg-emerald-400/10 border-emerald-400/20" },
  Sales: { icon: "↗", className: "text-amber-200 bg-amber-400/10 border-amber-400/20" },
  "Follow-ups": { icon: "↻", className: "text-sky-200 bg-sky-400/10 border-sky-400/20" },
  "Client Delivery": { icon: "□", className: "text-cyan-200 bg-cyan-400/10 border-cyan-400/20" },
  Product: { icon: "◆", className: "text-indigo-200 bg-indigo-400/10 border-indigo-400/20" },
  Content: { icon: "✦", className: "text-pink-200 bg-pink-400/10 border-pink-400/20" },
  Learning: { icon: "◫", className: "text-blue-200 bg-blue-400/10 border-blue-400/20" },
  "Market Research": { icon: "⌕", className: "text-blue-200 bg-blue-400/10 border-blue-400/20" },
  Administration: { icon: "≡", className: "text-slate-200 bg-slate-400/10 border-slate-400/20" },
  Personal: { icon: "○", className: "text-rose-200 bg-rose-400/10 border-rose-400/20" },
  "Personal Execution": { icon: "◎", className: "text-rose-200 bg-rose-400/10 border-rose-400/20" },
  "Field Visits": { icon: "⌖", className: "text-cyan-200 bg-cyan-400/10 border-cyan-400/20" },
  Uncategorized: { icon: "·", className: "text-gray-300 bg-white/5 border-white/10" },
};

export type ChecklistMetricItem = {
  status: ChecklistStatus;
  priority: ChecklistPriority;
  is_top_three: boolean;
};

export function checklistMetrics(items: ChecklistMetricItem[]) {
  const total = items.length;
  const done = items.filter((item) => item.status === "done").length;
  const notDone = items.filter((item) => item.status === "not_done").length;
  const skipped = items.filter((item) => item.status === "skipped").length;
  const pending = total - done - notDone - skipped;
  const reviewed = done + notDone + skipped;
  const topThree = items.filter((item) => item.is_top_three);
  const critical = items.filter((item) => item.priority === "Critical");
  return {
    total, done, notDone, skipped, pending, reviewed,
    completionRate: total ? Math.round(done / total * 100) : null,
    reviewRate: total ? Math.round(reviewed / total * 100) : null,
    topThreeRate: topThree.length
      ? Math.round(topThree.filter((item) => item.status === "done").length / topThree.length * 100)
      : null,
    criticalRate: critical.length
      ? Math.round(critical.filter((item) => item.status === "done").length / critical.length * 100)
      : null,
  };
}

/**
 * Weighted day score:
 * completion 40%, Top 3 completion 25%, Critical completion 20%,
 * review rate 10%, meaningful volume 5%.
 * Volume is capped at 10 completed items so a one-item Optional day cannot
 * outrank a substantial execution day merely through a 100% completion rate.
 */
export function weightedDayScore(items: ChecklistMetricItem[]) {
  if (!items.length) return 0;
  const metric = checklistMetrics(items);
  const volumeScore = Math.min(metric.done / 10, 1) * 100;
  return Math.round(
    (metric.completionRate || 0) * 0.4 +
    (metric.topThreeRate || 0) * 0.25 +
    (metric.criticalRate || 0) * 0.2 +
    (metric.reviewRate || 0) * 0.1 +
    volumeScore * 0.05,
  );
}
