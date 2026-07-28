"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ChecklistTemplates from "@/components/Portal/ChecklistTemplates";
import ChecklistBusinessLinks from "@/components/Portal/ChecklistBusinessLinks";
import {
  CATEGORY_STYLE,
  CHECKLIST_CATEGORIES,
  CHECKLIST_PRIORITIES,
  CHECKLIST_RECURRENCES,
  CHECKLIST_UNITS,
  MISSED_REASONS,
  ChecklistCategory,
  ChecklistPriority,
  ChecklistStatus,
  weightedDayScore,
} from "@/lib/daily-checklist";

type ChecklistItem = {
  id: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  createdAt: string;
  category: ChecklistCategory;
  priority: ChecklistPriority;
  isTopThree: boolean;
  targetValue: number | null;
  actualValue: number | null;
  unit: string | null;
  missedReason: string | null;
  rescheduledFromId: string | null;
  relatedTaskId: string | null;
  relatedLeadId: string | null;
  relatedClientId: string | null;
  relatedProjectId: string | null;
  recurrence: string;
};

type ChecklistStore = Record<string, ChecklistItem[]>;
type ReportMode = "week" | "month";
type ChecklistRow = {
  id: string;
  client_id: string;
  checklist_date: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  created_at: string;
  category: ChecklistCategory;
  priority: ChecklistPriority;
  is_top_three: boolean;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  missed_reason: string | null;
  rescheduled_from_id: string | null;
  related_task_id: string | null;
  related_lead_id: string | null;
  related_client_id: string | null;
  related_project_id: string | null;
  recurrence: string;
};

const STORAGE_KEY = "groenics-daily-checklist-v1";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function moveDate(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function periodDateKeys(anchorKey: string, mode: ReportMode) {
  const anchor = dateFromKey(anchorKey);

  if (mode === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() - (6 - index));
      return localDateKey(date);
    });
  }

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) =>
    localDateKey(new Date(year, month, index + 1)),
  );
}

function rowsToStore(rows: ChecklistRow[]) {
  return rows.reduce<ChecklistStore>((result, row) => {
    const item: ChecklistItem = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      category: row.category,
      priority: row.priority,
      isTopThree: row.is_top_three,
      targetValue: row.target_value,
      actualValue: row.actual_value,
      unit: row.unit,
      missedReason: row.missed_reason,
      rescheduledFromId: row.rescheduled_from_id,
      relatedTaskId: row.related_task_id,
      relatedLeadId: row.related_lead_id,
      relatedClientId: row.related_client_id,
      relatedProjectId: row.related_project_id,
      recurrence: row.recurrence,
    };
    result[row.checklist_date] = [...(result[row.checklist_date] || []), item];
    return result;
  }, {});
}

export default function DailyChecklistPage() {
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [store, setStore] = useState<ChecklistStore>({});
  const [newItem, setNewItem] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("week");
  const [databaseReady, setDatabaseReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newCategory, setNewCategory] = useState<ChecklistCategory>("Uncategorized");
  const [newPriority, setNewPriority] = useState<ChecklistPriority>("Important");
  const [newTarget, setNewTarget] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newTopThree, setNewTopThree] = useState(false);
  const [newRecurrence, setNewRecurrence] = useState("None");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actualDrafts, setActualDrafts] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState({
    biggest_win: "", biggest_lesson: "", main_obstacle: "", general_notes: "", tomorrow_focus: "",
  });
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportReflection, setReportReflection] = useState({ what_worked: "", what_failed: "", next_change: "", next_priorities: "" });
  const [integrationItem, setIntegrationItem] = useState<ChecklistItem | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      let localStore: ChecklistStore = {};
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) localStore = JSON.parse(saved) as ChecklistStore;
      } catch {
        localStore = {};
      }

      try {
        const localItems = Object.entries(localStore).flatMap(([date, items]) =>
          items.map((item) => ({
            client_id: item.id,
            checklist_date: date,
            title: item.title,
            description: item.description || null,
            status: item.status,
            created_at: item.createdAt,
            category: item.category || "Uncategorized",
            priority: item.priority || "Important",
            is_top_three: item.isTopThree || false,
            target_value: item.targetValue ?? null,
            actual_value: item.actualValue ?? null,
            unit: item.unit ?? null,
            recurrence: item.recurrence || "None",
            missed_reason: item.missedReason ?? null,
          })),
        );

        if (localItems.length > 0) {
          const { error: migrationError } = await supabase
            .from("daily_checklist_items")
            .upsert(localItems, { onConflict: "user_id,client_id", ignoreDuplicates: true });
          if (migrationError) throw migrationError;
        }

        const { data, error: loadError } = await supabase
          .from("daily_checklist_items")
          .select("id,client_id,checklist_date,title,description,status,created_at,category,priority,is_top_three,target_value,actual_value,unit,recurrence,missed_reason,rescheduled_from_id,related_task_id,related_lead_id,related_client_id,related_project_id")
          .is("deleted_at", null)
          .order("checklist_date", { ascending: true })
          .order("created_at", { ascending: true });
        if (loadError) throw loadError;

        setStore(rowsToStore((data || []) as ChecklistRow[]));
        const { data: reflectionData } = await supabase
          .from("daily_checklist_reflections")
          .select("biggest_win,biggest_lesson,main_obstacle,general_notes,tomorrow_focus")
          .eq("reflection_date", selectedDate)
          .maybeSingle();
        if (reflectionData) setReflection({
          biggest_win: reflectionData.biggest_win || "",
          biggest_lesson: reflectionData.biggest_lesson || "",
          main_obstacle: reflectionData.main_obstacle || "",
          general_notes: reflectionData.general_notes || "",
          tomorrow_focus: reflectionData.tomorrow_focus || "",
        });
        setDatabaseReady(true);
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (caught) {
        setStore(localStore);
        setSyncError(
          caught instanceof Error && !caught.message.includes("daily_checklist_items")
            ? caught.message
            : "Run DAILY_CHECKLIST_V2_UPGRADE.sql in Supabase to enable Founder Execution System syncing.",
        );
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedDate, refreshKey]);

  useEffect(() => {
    if (!hydrated || databaseReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [databaseReady, hydrated, store]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const keys = periodDateKeys(selectedDate, reportMode);
      const { data } = await supabase.from("checklist_report_reflections")
        .select("what_worked,what_failed,next_change,next_priorities")
        .eq("period_type", reportMode === "week" ? "weekly" : "monthly")
        .eq("period_start", keys[0]).eq("period_end", keys[keys.length - 1]).maybeSingle();
      setReportReflection({
        what_worked: data?.what_worked || "", what_failed: data?.what_failed || "", next_change: data?.next_change || "",
        next_priorities: Array.isArray(data?.next_priorities) ? data.next_priorities.join("\n") : "",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reportMode, selectedDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedItemIds(new Set());
      setSelectionMode(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedDate]);

  const items = useMemo(() => store[selectedDate] || [], [selectedDate, store]);
  const doneCount = items.filter((item) => item.status === "done").length;
  const notDoneCount = items.filter((item) => item.status === "not_done").length;
  const skippedCount = items.filter((item) => item.status === "skipped").length;
  const pendingCount = items.length - doneCount - notDoneCount - skippedCount;
  const reviewedCount = doneCount + notDoneCount + skippedCount;
  const completionProgress = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const reviewProgress = items.length ? Math.round((reviewedCount / items.length) * 100) : 0;
  const isToday = selectedDate === localDateKey();
  const visibleItems = items.filter((item) =>
    (!categoryFilter || item.category === categoryFilter) &&
    (!priorityFilter || item.priority === priorityFilter) &&
    (!statusFilter || item.status === statusFilter)
  );
  const report = useMemo(() => {
    const keys = periodDateKeys(selectedDate, reportMode);
    const days = keys.map((key) => {
      const dayItems = store[key] || [];
      const done = dayItems.filter((item) => item.status === "done").length;
      const notDone = dayItems.filter((item) => item.status === "not_done").length;
      const skipped = dayItems.filter((item) => item.status === "skipped").length;
      const pending = dayItems.length - done - notDone - skipped;
      return {
        key,
        total: dayItems.length,
        done,
        notDone,
        skipped,
        pending,
        completionRate: dayItems.length ? Math.round((done / dayItems.length) * 100) : 0,
        score: weightedDayScore(dayItems.map((item) => ({
          status: item.status,
          priority: item.priority || "Important",
          is_top_three: item.isTopThree,
        }))),
      };
    });
    const total = days.reduce((sum, day) => sum + day.total, 0);
    const done = days.reduce((sum, day) => sum + day.done, 0);
    const notDone = days.reduce((sum, day) => sum + day.notDone, 0);
    const skipped = days.reduce((sum, day) => sum + day.skipped, 0);
    const pending = days.reduce((sum, day) => sum + day.pending, 0);
    const activeDays = days.filter((day) => day.total > 0);
    const bestDay = activeDays.reduce<(typeof days)[number] | null>(
      (best, day) =>
        !best ||
        day.score > best.score ||
        (day.score === best.score && day.done > best.done)
          ? day
          : best,
      null,
    );
    const missedItems = keys
      .flatMap((key) =>
        (store[key] || [])
          .filter((item) => item.status === "not_done")
          .map((item) => ({ ...item, dateKey: key })),
      )
      .reverse();
    const periodItems = keys.flatMap((key) => (store[key] || []).map((item) => ({ ...item, dateKey: key })));
    const topThree = periodItems.filter((item) => item.isTopThree);
    const critical = periodItems.filter((item) => item.priority === "Critical");
    const categoryPerformance = CHECKLIST_CATEGORIES.map((category) => {
      const categoryItems = periodItems.filter((item) => item.category === category);
      const completed = categoryItems.filter((item) => item.status === "done").length;
      return { category, total: categoryItems.length, completed, rate: categoryItems.length ? Math.round(completed / categoryItems.length * 100) : 0 };
    }).filter((category) => category.total > 0).sort((a, b) => b.total - a.total);
    const missedReasonCounts = periodItems.filter((item) => item.status === "not_done" && item.missedReason)
      .reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.missedReason!]: (counts[item.missedReason!] || 0) + 1 }), {});
    const commonMissedReason = Object.entries(missedReasonCounts).sort((a, b) => b[1] - a[1])[0] || null;
    const missedTitleCounts = periodItems.filter((item) => item.status === "not_done")
      .reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.title]: (counts[item.title] || 0) + 1 }), {});
    const frequentMissed = Object.entries(missedTitleCounts).sort((a, b) => b[1] - a[1])[0] || null;
    const weakestDay = activeDays.reduce<(typeof days)[number] | null>((weakest, day) => !weakest || day.score < weakest.score ? day : weakest, null);
    const previousAnchor = reportMode === "week"
      ? moveDate(selectedDate, -7)
      : localDateKey(new Date(dateFromKey(selectedDate).getFullYear(), dateFromKey(selectedDate).getMonth() - 1, 1));
    const previousKeys = periodDateKeys(previousAnchor, reportMode);
    const previousItems = previousKeys.flatMap((key) => store[key] || []);
    const previousDone = previousItems.filter((item) => item.status === "done").length;
    const previousCompletion = previousItems.length ? Math.round(previousDone / previousItems.length * 100) : null;
    const numericTotals = periodItems.filter((item) => item.targetValue !== null)
      .reduce((totals, item) => ({ target: totals.target + (item.targetValue || 0), actual: totals.actual + (item.actualValue || 0) }), { target: 0, actual: 0 });
    let streak = 0;
    const sortedPastKeys = Object.keys(store).filter((key) => key <= selectedDate).sort().reverse();
    for (const key of sortedPastKeys) {
      const dayItems = store[key] || [];
      if (!dayItems.length || !dayItems.every((item) => item.status === "done")) break;
      streak += 1;
    }
    const weekGroups = reportMode === "month"
      ? Array.from({ length: Math.ceil(keys.length / 7) }, (_, index) => keys.slice(index * 7, index * 7 + 7))
      : [keys];
    const weeklyComparison = weekGroups.map((weekKeys, index) => {
      const weekItems = weekKeys.flatMap((key) => store[key] || []);
      const weekDone = weekItems.filter((item) => item.status === "done").length;
      const activeScores = weekKeys.map((key) => {
        const dayItems = store[key] || [];
        return dayItems.length ? weightedDayScore(dayItems.map((item) => ({
          status: item.status, priority: item.priority || "Important", is_top_three: item.isTopThree,
        }))) : null;
      }).filter((score): score is number => score !== null);
      return {
        label: `Week ${index + 1}`, total: weekItems.length, done: weekDone,
        completionRate: weekItems.length ? Math.round(weekDone / weekItems.length * 100) : 0,
        score: activeScores.length ? Math.round(activeScores.reduce((sum, score) => sum + score, 0) / activeScores.length) : 0,
      };
    });
    const activeWeeks = weeklyComparison.filter((week) => week.total > 0);
    const bestWeek = activeWeeks.reduce<(typeof weeklyComparison)[number] | null>((best, week) => !best || week.score > best.score ? week : best, null);
    const weakestWeek = activeWeeks.reduce<(typeof weeklyComparison)[number] | null>((weakest, week) => !weakest || week.score < weakest.score ? week : weakest, null);
    const revenueDefinitions = [
      ["Targeted outreaches", /outreach/i],
      ["Calls", /prospect call|sales call/i],
      ["Meetings/demos", /meeting|demo/i],
      ["Proposals", /proposal/i],
      ["Clients closed", /client.*closed|closed.*client/i],
      ["Cash collected", /cash collected|payment collected|revenue collected/i],
    ] as const;
    const revenueActivity = revenueDefinitions.map(([label, pattern]) => {
      const matching = periodItems.filter((item) => pattern.test(item.title) && item.actualValue !== null);
      return { label, value: matching.reduce((sum, item) => sum + (item.actualValue || 0), 0), records: matching.length };
    }).filter((activity) => activity.records > 0);

    return {
      days,
      total,
      done,
      notDone,
      skipped,
      pending,
      activeDays: activeDays.length,
      completionRate: total ? Math.round((done / total) * 100) : 0,
      reviewRate: total ? Math.round(((done + notDone + skipped) / total) * 100) : 0,
      bestDay,
      weakestDay,
      missedItems,
      topThreeRate: topThree.length ? Math.round(topThree.filter((item) => item.status === "done").length / topThree.length * 100) : null,
      criticalRate: critical.length ? Math.round(critical.filter((item) => item.status === "done").length / critical.length * 100) : null,
      categoryPerformance,
      commonMissedReason,
      frequentMissed,
      previousCompletion,
      completionChange: previousCompletion === null ? null : (total ? Math.round(done / total * 100) : 0) - previousCompletion,
      numericTotals,
      streak,
      unreviewed: periodItems.filter((item) => item.status === "pending"),
      rescheduled: periodItems.filter((item) => item.rescheduledFromId),
      weeklyComparison,
      bestWeek,
      weakestWeek,
      revenueActivity,
    };
  }, [reportMode, selectedDate, store]);

  function updateItems(update: (current: ChecklistItem[]) => ChecklistItem[]) {
    setStore((current) => ({
      ...current,
      [selectedDate]: update(current[selectedDate] || []),
    }));
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;

    const fallbackItem = {
      id: crypto.randomUUID(),
      title,
      description: null,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      category: newCategory,
      priority: newPriority,
      isTopThree: newTopThree,
      targetValue: newTarget ? Number(newTarget) : null,
      actualValue: null,
      unit: newUnit || null,
      missedReason: null,
      rescheduledFromId: null,
      relatedTaskId: null,
      relatedLeadId: null,
      relatedClientId: null,
      relatedProjectId: null,
      recurrence: newRecurrence,
    };

    setSaving(true);
    setSyncError("");
    try {
      if (databaseReady) {
        const { data, error } = await supabase
          .from("daily_checklist_items")
          .insert({
            client_id: fallbackItem.id,
            checklist_date: selectedDate,
            title,
            status: "pending",
            category: newCategory,
            priority: newPriority,
            is_top_three: newTopThree,
            target_value: newTarget ? Number(newTarget) : null,
            unit: newUnit || null,
            recurrence: newRecurrence,
          })
          .select("id,client_id,checklist_date,title,description,status,created_at,category,priority,is_top_three,target_value,actual_value,unit,recurrence,missed_reason,rescheduled_from_id,related_task_id,related_lead_id,related_client_id,related_project_id")
          .single();
        if (error) throw error;
        const row = data as ChecklistRow;
        updateItems((current) => [
          ...current,
          {
            id: row.id, title: row.title, description: row.description, status: row.status, createdAt: row.created_at,
            category: row.category, priority: row.priority, isTopThree: row.is_top_three,
            targetValue: row.target_value, actualValue: row.actual_value, unit: row.unit,
            missedReason: row.missed_reason, rescheduledFromId: row.rescheduled_from_id,
            relatedTaskId: row.related_task_id, relatedLeadId: row.related_lead_id,
            relatedClientId: row.related_client_id, relatedProjectId: row.related_project_id,
            recurrence: row.recurrence,
          },
        ]);
      } else {
        updateItems((current) => [...current, fallbackItem]);
      }
      setNewItem("");
      setNewTarget("");
      setNewUnit("");
      setNewTopThree(false);
      setNewRecurrence("None");
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to save this checklist item.");
    } finally {
      setSaving(false);
    }
  }

  async function importChecklistFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSaving(true);
    setSyncError("");
    try {
      const content = await file.text();
      if (file.name.toLowerCase().endsWith(".csv")) {
        const parseCsvLine = (line: string) => {
          const values: string[] = [];
          let value = "";
          let quoted = false;
          for (let index = 0; index < line.length; index += 1) {
            const character = line[index];
            if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
            else if (character === '"') quoted = !quoted;
            else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
            else value += character;
          }
          values.push(value.trim());
          return values;
        };
        const csvRows = content.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
        const headers = csvRows[0].map((header) => header.toLowerCase().trim());
        const column = (row: string[], name: string) => row[headers.indexOf(name)] || "";
        const titleHeader = headers.includes("item_name") ? "item_name" : "title";
        if (!headers.includes(titleHeader)) throw new Error("CSV must contain an item_name or title column.");
        const existingTitles = new Set(items.map((item) => item.title.trim().toLowerCase()));
        const seen = new Set<string>();
        const csvImportRows = csvRows.slice(1).map((row) => {
          const recurrenceInput = column(row, "recurrence") || "None";
          const categoryInput = column(row, "category") || "Uncategorized";
          const priorityInput = column(row, "priority") || "Important";
          const target = column(row, "target_value");
          return {
            title: column(row, titleHeader).trim().slice(0, 160),
            category: CHECKLIST_CATEGORIES.find((option) => option.toLowerCase() === categoryInput.toLowerCase()) || "Uncategorized",
            priority: CHECKLIST_PRIORITIES.find((option) => option.toLowerCase() === priorityInput.toLowerCase()) || "Important",
            target_value: target === "" ? null : Number(target),
            unit: column(row, "unit") || null,
            recurrence: CHECKLIST_RECURRENCES.find((option) => option.toLowerCase() === recurrenceInput.toLowerCase()) || "None",
          };
        }).filter((row) => {
          const key = row.title.toLowerCase();
          if (!row.title || seen.has(key) || existingTitles.has(key)) return false;
          seen.add(key); return true;
        });
        if (!csvImportRows.length) throw new Error("No new checklist items were found in this CSV.");
        if (!window.confirm(`Import ${csvImportRows.length} items with category, priority, target, unit and recurrence into ${selectedDate}?`)) return;
        const { error } = await supabase.from("daily_checklist_items").insert(csvImportRows.map((row) => ({
          checklist_date: selectedDate, status: "pending", ...row,
        })));
        if (error) throw error;
        setRefreshKey((key) => key + 1);
        return;
      }
      let titles: string[] = [];
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(content) as unknown;
        if (!Array.isArray(parsed)) throw new Error("JSON must contain an array of checklist items.");
        titles = parsed.map((entry) => typeof entry === "string" ? entry : typeof entry === "object" && entry !== null && "title" in entry ? String((entry as { title: unknown }).title) : "");
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        const rows = content.split(/\r?\n/).filter(Boolean);
        const titleIndex = rows[0]?.toLowerCase().split(",").findIndex((column) => column.trim() === "title") ?? -1;
        titles = rows.slice(titleIndex >= 0 ? 1 : 0).map((row) => {
          const columns = row.split(",");
          return (columns[titleIndex >= 0 ? titleIndex : 0] || "").replace(/^["']|["']$/g, "").trim();
        });
      } else {
        titles = content.split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]\])\s*/, "").trim());
      }
      const existingTitles = new Set(items.map((item) => item.title.trim().toLowerCase()));
      const uniqueTitles = [...new Set(titles.map((title) => title.trim().slice(0, 160)).filter(Boolean))]
        .filter((title) => !existingTitles.has(title.toLowerCase()));
      if (!uniqueTitles.length) throw new Error("No new checklist items were found in this file.");
      if (!window.confirm(`Import ${uniqueTitles.length} new items into ${selectedDate}?`)) return;
      const { error } = await supabase.from("daily_checklist_items").insert(uniqueTitles.map((title) => ({
        checklist_date: selectedDate, title, status: "pending",
        category: "Uncategorized", priority: "Important", recurrence: "None",
      })));
      if (error) throw error;
      setRefreshKey((key) => key + 1);
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to import this to-do list.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: ChecklistStatus) {
    setSaving(true);
    setSyncError("");
    try {
      if (databaseReady) {
        const { error } = await supabase
          .from("daily_checklist_items")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      }
      updateItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to update this checklist item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTopThree(item: ChecklistItem) {
    if (!item.isTopThree && items.filter((current) => current.isTopThree).length >= 3) {
      setSyncError("Daily Top 3 is full. Remove one priority before adding another.");
      return;
    }
    setSaving(true);
    setSyncError("");
    try {
      if (databaseReady) {
        const { error } = await supabase
          .from("daily_checklist_items")
          .update({ is_top_three: !item.isTopThree })
          .eq("id", item.id);
        if (error) throw error;
      }
      updateItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isTopThree: !entry.isTopThree } : entry,
        ),
      );
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to update the Daily Top 3.");
    } finally {
      setSaving(false);
    }
  }

  async function saveActual(item: ChecklistItem) {
    const raw = actualDrafts[item.id];
    if (raw === undefined) return;
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setSyncError("Actual value must be zero or greater.");
      return;
    }
    setSaving(true);
    try {
      if (databaseReady) {
        const { error } = await supabase.from("daily_checklist_items").update({ actual_value: value }).eq("id", item.id);
        if (error) throw error;
      }
      updateItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, actualValue: value } : entry));
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to save the actual value.");
    } finally {
      setSaving(false);
    }
  }

  async function markNotDone(item: ChecklistItem) {
    const reasonList = MISSED_REASONS.map(([code, label]) => `${code}: ${label}`).join("\n");
    const entered = window.prompt(`Optional: enter a missed-reason code.\n\n${reasonList}`, item.missedReason || "");
    if (entered === null) return;
    const validReason = MISSED_REASONS.some(([code]) => code === entered) ? entered : null;
    setSaving(true);
    try {
      if (databaseReady) {
        const { error } = await supabase.from("daily_checklist_items").update({
          status: "not_done",
          missed_reason: validReason,
          missed_reason_note: validReason ? null : entered.trim() || null,
        }).eq("id", item.id);
        if (error) throw error;
      }
      updateItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "not_done", missedReason: validReason } : entry));
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to save the missed-item review.");
    } finally {
      setSaving(false);
    }
  }

  function changeStatusFromSheet(item: ChecklistItem, status: ChecklistStatus) {
    if (status === "not_done") void markNotDone(item);
    else void setStatus(item.id, status);
  }

  async function moveToTomorrow(item: ChecklistItem) {
    if (item.rescheduledFromId || !window.confirm(`Move "${item.title}" to tomorrow? The original record will remain here.`)) return;
    setSaving(true);
    try {
      const tomorrow = moveDate(selectedDate, 1);
      const { data: original, error: originalError } = await supabase
        .from("daily_checklist_items").select("rescheduled_to_id").eq("id", item.id).single();
      if (originalError) throw originalError;
      if (original.rescheduled_to_id) throw new Error("This item has already been rescheduled.");
      const { data, error } = await supabase.from("daily_checklist_items").insert({
        checklist_date: tomorrow, title: item.title, category: item.category,
        priority: item.priority, target_value: item.targetValue, unit: item.unit,
        rescheduled_from_id: item.id, status: "pending",
      }).select("id").single();
      if (error) throw error;
      const { error: linkError } = await supabase.from("daily_checklist_items").update({
        rescheduled_to_id: data.id,
        status: item.status === "pending" ? "not_done" : item.status,
      }).eq("id", item.id).is("rescheduled_to_id", null);
      if (linkError) throw linkError;
      updateItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === "pending" ? "not_done" : entry.status } : entry));
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to reschedule this item.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReflection() {
    setReflectionSaving(true);
    setSyncError("");
    try {
      const { error } = await supabase.from("daily_checklist_reflections").upsert({
        reflection_date: selectedDate,
        ...reflection,
      }, { onConflict: "user_id,reflection_date" });
      if (error) throw error;
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to save the daily reflection.");
    } finally {
      setReflectionSaving(false);
    }
  }

  async function saveReportReflection() {
    const keys = periodDateKeys(selectedDate, reportMode);
    setSaving(true);
    try {
      const { error } = await supabase.from("checklist_report_reflections").upsert({
        period_type: reportMode === "week" ? "weekly" : "monthly",
        period_start: keys[0], period_end: keys[keys.length - 1],
        what_worked: reportReflection.what_worked, what_failed: reportReflection.what_failed,
        next_change: reportReflection.next_change,
        next_priorities: reportReflection.next_priorities.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 3),
      }, { onConflict: "user_id,period_type,period_start,period_end" });
      if (error) throw error;
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to save the report reflection.");
    } finally {
      setSaving(false);
    }
  }

  async function exportWeeklyReport() {
    setSaving(true);
    try {
      const { jsPDF } = await import("jspdf");
      // Exact 9:16 portrait canvas. Keeping the 210 mm width preserves the
      // complete report layout while extending the page to 373.33 mm.
      const document = new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 373.333] });
      const weekKeys = periodDateKeys(selectedDate, "week");
      const weeklyItems = weekKeys.flatMap((key) => (store[key] || []).map((item) => ({ ...item, dateKey: key })));
      const weeklyDone = weeklyItems.filter((item) => item.status === "done").length;
      const weeklyReviewed = weeklyItems.filter((item) => item.status !== "pending").length;
      const completion = weeklyItems.length ? Math.round(weeklyDone / weeklyItems.length * 100) : 0;
      const review = weeklyItems.length ? Math.round(weeklyReviewed / weeklyItems.length * 100) : 0;
      document.setFillColor(18, 16, 12);
      document.rect(0, 0, 210, 373.333, "F");
      document.setTextColor(222, 185, 91);
      document.setFontSize(11);
      document.text("GROENICS · FOUNDER EXECUTION JOURNEY", 18, 22);
      document.setTextColor(255, 255, 255);
      document.setFontSize(26);
      document.text("Weekly Progress Report", 18, 38);
      document.setTextColor(165, 159, 146);
      document.setFontSize(10);
      document.text(`${weekKeys[0]} to ${weekKeys[6]} · Asia/Kolkata`, 18, 47);
      const metrics = [
        ["PLANNED", weeklyItems.length], ["COMPLETED", weeklyDone],
        ["COMPLETION", `${completion}%`], ["DAILY REVIEW", `${review}%`],
      ] as const;
      metrics.forEach(([label, value], index) => {
        const x = 18 + (index % 2) * 88;
        const y = 65 + Math.floor(index / 2) * 29;
        document.setFillColor(32, 29, 22);
        document.roundedRect(x, y, 80, 22, 3, 3, "F");
        document.setTextColor(145, 139, 126); document.setFontSize(8); document.text(label, x + 6, y + 7);
        document.setTextColor(255, 255, 255); document.setFontSize(16); document.text(String(value), x + 6, y + 17);
      });
      document.setTextColor(222, 185, 91); document.setFontSize(12); document.text("Daily completion", 18, 132);
      weekKeys.forEach((key, index) => {
        const dayItems = store[key] || [];
        const done = dayItems.filter((item) => item.status === "done").length;
        const rate = dayItems.length ? Math.round(done / dayItems.length * 100) : 0;
        const y = 143 + index * 14;
        document.setTextColor(190, 185, 174); document.setFontSize(9);
        document.text(dateFromKey(key).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), 18, y);
        document.setFillColor(52, 48, 38); document.roundedRect(58, y - 4, 100, 5, 2, 2, "F");
        document.setFillColor(89, 151, 95); document.roundedRect(58, y - 4, rate, 5, 2, 2, "F");
        document.setTextColor(255, 255, 255); document.text(`${rate}%`, 164, y);
      });
      document.setTextColor(222, 185, 91); document.setFontSize(11); document.text("Reflection", 18, 252);
      document.setTextColor(185, 180, 168); document.setFontSize(9);
      const reflectionText = reportReflection.what_worked || reflection.biggest_win || "Keep showing up. Progress compounds.";
      document.text(document.splitTextToSize(reflectionText, 172), 18, 261);
      document.setTextColor(100, 96, 86); document.setFontSize(8);
      document.setTextColor(222, 185, 91); document.setFontSize(15);
      document.text("BUILD. REVIEW. BECOME.", 18, 338);
      document.setTextColor(100, 96, 86); document.setFontSize(8);
      document.text("Generated from the Groenics Founder Execution System · 9:16 Progress Journey", 18, 360);
      document.save(`groenics-weekly-progress-${weekKeys[0]}-${weekKeys[6]}.pdf`);
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to export the weekly report.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id: string) {
    setSaving(true);
    setSyncError("");
    try {
      if (databaseReady) {
        const { error } = await supabase
          .from("daily_checklist_items")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      }
      updateItems((current) => current.filter((item) => item.id !== id));
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to delete this checklist item.");
    } finally {
      setSaving(false);
    }
  }

  function toggleItemSelection(id: string) {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function permanentlyDeleteSelected() {
    const ids = [...selectedItemIds];
    if (!ids.length) return;
    if (!window.confirm(`Permanently delete ${ids.length} selected checklist items from the database? This cannot be undone.`)) return;
    setSaving(true);
    setSyncError("");
    try {
      const { error } = await supabase.from("daily_checklist_items").delete().in("id", ids);
      if (error) throw error;
      updateItems((current) => current.filter((item) => !selectedItemIds.has(item.id)));
      setSelectedItemIds(new Set());
      setSelectionMode(false);
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : "Unable to permanently delete the selected items.");
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = dateFromKey(selectedDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/70">
            Evening review
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Daily checklist</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
            Add what you plan to do, then close your day by marking each item done or not done.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-amber-300/10 bg-black/25 p-2">
          <button
            type="button"
            onClick={() => setSelectedDate((date) => moveDate(date, -1))}
            aria-label="Previous day"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-gray-300 transition hover:bg-white/8 hover:text-white"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(localDateKey())}
            className="min-w-44 rounded-xl px-3 py-2 text-center transition hover:bg-white/5"
          >
            <span className="block text-xs font-semibold uppercase tracking-wider text-amber-300">
              {isToday ? "Today" : "Selected day"}
            </span>
            <span className="mt-0.5 block text-sm text-gray-300">{dateLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate((date) => moveDate(date, 1))}
            aria-label="Next day"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-gray-300 transition hover:bg-white/8 hover:text-white"
          >
            →
          </button>
        </div>
      </header>

      {syncError && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {syncError}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-amber-300/15 bg-[#0d0c09] shadow-2xl shadow-black/20">
        <div className="border-b border-amber-300/10 bg-gradient-to-r from-amber-300/10 via-amber-300/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {items.length === 0
                  ? "No checklist items yet"
                  : `${doneCount} of ${items.length} completed · ${pendingCount} pending review`}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {databaseReady
                  ? "Synced securely with Supabase across your devices."
                  : "Saved on this device until Supabase syncing is enabled."}
              </p>
            </div>
            <div className="grid min-w-56 gap-2">
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="w-24">Task Completion</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${completionProgress}%` }} />
                </div>
                <span className="w-9 text-right text-green-300">{completionProgress}%</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="w-24">Daily Review</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                    className="h-full rounded-full bg-amber-300 transition-all"
                    style={{ width: `${reviewProgress}%` }}
                />
                </div>
                <span className="w-9 text-right text-amber-200">{reviewProgress}%</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={addItem} className="border-b border-amber-300/10 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="new-checklist-item">
              New checklist item
            </label>
            <input
              id="new-checklist-item"
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              maxLength={160}
              placeholder="What do you want to get done?"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/10"
            />
            <button
              type="submit"
              disabled={!newItem.trim() || saving}
              className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "+ Add item"}
            </button>
            <label className="cursor-pointer rounded-xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-center text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15">
              Import to-do list
              <input type="file" accept=".txt,.csv,.json,text/plain,text/csv,application/json" onChange={importChecklistFile} disabled={saving || !databaseReady} className="sr-only" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((open) => !open)}
            className="mt-3 text-xs font-semibold text-amber-200 hover:text-amber-100"
          >
            {showAdvanced ? "Hide advanced fields" : "Category, priority, target and Top 3"}
          </button>
          {showAdvanced && (
            <div className="mt-4 grid gap-3 rounded-xl border border-white/8 bg-black/20 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs text-gray-400">Category
                <select value={newCategory} onChange={(event) => setNewCategory(event.target.value as ChecklistCategory)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-white">
                  {CHECKLIST_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Priority
                <select value={newPriority} onChange={(event) => setNewPriority(event.target.value as ChecklistPriority)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-white">
                  {CHECKLIST_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Target value
                <input type="number" min="0" step="any" value={newTarget} onChange={(event) => setNewTarget(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-white" />
              </label>
              <label className="text-xs text-gray-400">Unit
                <select value={newUnit} onChange={(event) => setNewUnit(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-white">
                  <option value="">None</option>
                  {CHECKLIST_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Recurrence
                <select value={newRecurrence} onChange={(event) => setNewRecurrence(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-white">
                  {CHECKLIST_RECURRENCES.map((recurrence) => <option key={recurrence}>{recurrence}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2">
                <input type="checkbox" checked={newTopThree} disabled={!newTopThree && items.filter((item) => item.isTopThree).length >= 3} onChange={(event) => setNewTopThree(event.target.checked)} />
                Add to Daily Top 3
              </label>
            </div>
          )}
        </form>

        <div className="p-4 sm:p-6">
          {items.length > 0 && (
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-gray-300">
                <option value="">All statuses</option><option value="pending">Pending</option><option value="done">Done</option><option value="not_done">Not done</option><option value="skipped">Skipped</option>
              </select>
              <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-gray-300">
                <option value="">All categories</option>{CHECKLIST_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-lg border border-white/10 bg-[#11100d] p-2.5 text-sm text-gray-300">
                <option value="">All priorities</option>{CHECKLIST_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </div>
          )}
          {items.some((item) => item.isTopThree) && (
            <section className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.045] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Daily Top 3</p>
                  <p className="mt-1 text-xs text-gray-500">Your highest-leverage outcomes for this date</p>
                </div>
                <span className="text-sm font-bold text-amber-200">
                  {items.filter((item) => item.isTopThree && item.status === "done").length}/{items.filter((item) => item.isTopThree).length}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {items.filter((item) => item.isTopThree).map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-amber-300/10 bg-black/25 p-3">
                    <span className="text-xs text-amber-300">0{index + 1}</span>
                    <p className={`mt-1 text-sm ${item.status === "done" ? "text-gray-500 line-through" : "text-white"}`}>{item.title}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!hydrated ? (
            <div className="py-14 text-center text-sm text-gray-500">Loading your checklist…</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-300/15 bg-amber-300/[0.025] px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-xl text-amber-200">
                ✓
              </div>
              <h2 className="mt-4 font-semibold text-white">Start your list for the day</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                Add your first item above. In the evening, choose Done or Not done for every item.
              </p>
            </div>
          ) : (
            <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/20 p-2">
              {!selectionMode ? (
                <button type="button" onClick={() => setSelectionMode(true)} className="rounded-lg bg-white/8 px-3 py-2 text-xs font-semibold text-gray-200">Select items</button>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedItemIds(new Set(visibleItems.map((item) => item.id)))} className="rounded-lg bg-white/8 px-3 py-2 text-xs font-semibold text-gray-200">Select all visible</button>
                    <button type="button" onClick={() => { setSelectedItemIds(new Set()); setSelectionMode(false); }} className="rounded-lg bg-white/8 px-3 py-2 text-xs text-gray-400">Cancel selection</button>
                  </div>
                  <button type="button" onClick={permanentlyDeleteSelected} disabled={!selectedItemIds.size || saving} className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-40">
                    Delete selected permanently ({selectedItemIds.size})
                  </button>
                </>
              )}
            </div>
            <ul className="grid gap-2 overflow-visible text-white xl:grid-cols-2">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className={`group rounded-xl border border-white/10 border-l-2 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition duration-150 hover:border-white/15 hover:bg-white/[0.045] ${
                    item.status === "done"
                      ? "border-l-green-400 bg-green-500/[0.04]"
                      : item.status === "not_done"
                        ? "border-l-red-400 bg-red-500/[0.03]"
                        : item.status === "skipped" ? "border-l-gray-500 bg-[#0c0d0b]/95" : "border-l-amber-300/30 bg-[#0c0d0b]/95"
                  }`}
                >
                  <div className={`grid gap-2 md:items-center md:gap-2 ${selectionMode ? "md:grid-cols-[18px_26px_minmax(120px,1fr)_105px_auto]" : "md:grid-cols-[26px_minmax(120px,1fr)_105px_auto]"}`}>
                    {selectionMode && <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      aria-label={`Select ${item.title} for permanent deletion`}
                      className="h-4 w-4 accent-red-600"
                    />}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setStatus(item.id, item.status === "done" ? "pending" : "done")}
                      aria-label={item.status === "done" ? "Mark as pending" : "Mark as done"}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                        item.status === "done"
                          ? "border-green-400 bg-green-400 text-black"
                          : "border-white/25 bg-white/[0.025] text-transparent hover:border-amber-300/70"
                      }`}
                    >
                      ✓
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-md border border-white/8 bg-white/[0.055] px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
                          {CATEGORY_STYLE[item.category || "Uncategorized"].icon} {item.category || "Uncategorized"}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${item.priority === "Critical" ? "text-red-300" : item.priority === "Important" ? "text-amber-200" : "text-gray-500"}`}>
                          {item.priority}
                        </span>
                        {item.isTopThree && <span className="text-[10px] font-bold uppercase text-amber-300">Top 3</span>}
                        {item.recurrence && item.recurrence !== "None" && <span className="text-[10px] text-sky-300">↻ {item.recurrence}</span>}
                      </div>
                      <p
                        className={`mt-0.5 truncate text-[13px] font-medium ${
                          item.status === "done"
                            ? "text-gray-600 line-through"
                            : item.status === "not_done"
                              ? "text-red-200"
                              : "text-gray-100"
                        }`}
                      >
                        {item.title}
                      </p>
                    </div>

                    <div className="flex min-h-7 items-center text-[10px] text-gray-500">
                      {item.targetValue !== null ? (
                        <>
                          <input aria-label={`Actual value for ${item.title}`} type="number" min="0" step="any" value={actualDrafts[item.id] ?? item.actualValue ?? ""} onChange={(event) => setActualDrafts((current) => ({ ...current, [item.id]: event.target.value }))} onBlur={() => saveActual(item)} className="w-12 rounded border border-white/10 bg-white/[0.045] px-1.5 py-1 text-white outline-none focus:border-amber-300/40" />
                          <span className="ml-1 whitespace-nowrap">/ {item.targetValue} {item.unit || ""}</span>
                        </>
                      ) : <span className="text-gray-700">—</span>}
                    </div>

                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      <select aria-label={`Status for ${item.title}`} disabled={saving} value={item.status} onChange={(event) => changeStatusFromSheet(item, event.target.value as ChecklistStatus)} className="h-7 min-w-24 rounded-lg border border-white/10 bg-[#171813] px-2 text-[11px] font-semibold text-gray-200 outline-none focus:border-amber-300/40">
                        <option value="pending">Pending</option>
                        <option value="done">Done</option>
                        <option value="not_done">Not done</option>
                        <option value="skipped">Skipped</option>
                      </select>
                      <details className="relative">
                        <summary aria-label={`More actions for ${item.title}`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded border border-[#afa384] bg-[#f8f2e3] font-bold text-[#4b4435]">•••</summary>
                        <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-[#b4a789] bg-[#faf4e5] p-1.5 text-[#29251d] shadow-xl">
                          <button type="button" onClick={() => toggleTopThree(item)} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#e9dfc8]">{item.isTopThree ? "Remove Top 3" : "Add to Top 3"}</button>
                          {(item.status === "pending" || item.status === "not_done") && <button type="button" onClick={() => moveToTomorrow(item)} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#e9dfc8]">Move tomorrow</button>}
                          <button type="button" onClick={() => setIntegrationItem(item)} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#e9dfc8]">Link / convert Task</button>
                          <button type="button" onClick={() => removeItem(item.id)} className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#9a3328] hover:bg-[#edd8cf]">Delete</button>
                        </div>
                      </details>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-300/15 bg-[#0d0c09] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/70">Daily reflection</p>
          <h2 className="mt-2 text-xl font-bold text-white">Close the day with clarity</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {([
            ["biggest_win", "Biggest win"],
            ["biggest_lesson", "Biggest lesson"],
            ["main_obstacle", "Main obstacle"],
            ["tomorrow_focus", "Tomorrow's focus"],
          ] as const).map(([field, label]) => (
            <label key={field} className="text-sm text-gray-400">{label}
              <textarea rows={3} value={reflection[field]} onChange={(event) => setReflection((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none focus:border-amber-300/40" />
            </label>
          ))}
          <label className="text-sm text-gray-400 sm:col-span-2">General notes
            <textarea rows={4} value={reflection.general_notes} onChange={(event) => setReflection((current) => ({ ...current, general_notes: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none focus:border-amber-300/40" />
          </label>
        </div>
        <button type="button" disabled={reflectionSaving || !databaseReady} onClick={saveReflection} className="mt-4 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-bold text-black disabled:opacity-40">
          {reflectionSaving ? "Saving…" : "Save reflection"}
        </button>
      </section>

      <ChecklistTemplates selectedDate={selectedDate} onApplied={() => setRefreshKey((key) => key + 1)} />
      {integrationItem && <ChecklistBusinessLinks item={integrationItem} onClose={() => setIntegrationItem(null)} onSaved={() => setRefreshKey((key) => key + 1)} />}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">To review</p>
          <p className="mt-2 text-2xl font-bold text-white">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-green-500/15 bg-green-500/[0.04] p-4">
          <p className="text-xs uppercase tracking-wider text-green-300/60">Done</p>
          <p className="mt-2 text-2xl font-bold text-green-300">{doneCount}</p>
        </div>
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4">
          <p className="text-xs uppercase tracking-wider text-red-300/60">Not done</p>
          <p className="mt-2 text-2xl font-bold text-red-300">{notDoneCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-amber-300/15 bg-[#0d0c09]">
        <div className="flex flex-col gap-4 border-b border-amber-300/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/70">
              Performance analysis
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {reportMode === "week" ? "Weekly report" : "Monthly report"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {reportMode === "week"
                ? `The 7 days ending ${dateFromKey(selectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                : dateFromKey(selectedDate).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
            </p>
          </div>
          <div className="flex flex-wrap rounded-xl border border-white/8 bg-black/30 p-1">
            {(["week", "month"] as ReportMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setReportMode(mode)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  reportMode === mode
                    ? "bg-amber-300 text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {mode === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
            <button type="button" onClick={exportWeeklyReport} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-500/10 disabled:opacity-40">
              Export weekly PDF
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Completion rate</p>
            <p className="mt-2 text-3xl font-bold text-amber-200">{report.completionRate}%</p>
            <p className="mt-1 text-xs text-gray-600">{report.done} of {report.total} items done</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Review rate</p>
            <p className="mt-2 text-3xl font-bold text-sky-300">{report.reviewRate}%</p>
            <p className="mt-1 text-xs text-gray-600">{report.pending} still awaiting review</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Active days</p>
            <p className="mt-2 text-3xl font-bold text-white">{report.activeDays}</p>
            <p className="mt-1 text-xs text-gray-600">Days with checklist items</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Best day</p>
            <p className="mt-2 truncate text-lg font-bold text-green-300">
              {report.bestDay
                ? dateFromKey(report.bestDay.key).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "No data yet"}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {report.bestDay
                ? `${report.bestDay.completionRate}% completed`
                : "Add items to begin tracking"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 border-t border-amber-300/10 p-5 lg:grid-cols-[1.5fr_1fr] sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Completion trend</h3>
                <p className="mt-1 text-xs text-gray-600">Daily percentage of planned items completed</p>
              </div>
              <div className="flex gap-3 text-[11px]">
                <span className="text-green-300">● Done</span>
                <span className="text-red-300">● Not done</span>
              </div>
            </div>

            <div
              className={`mt-5 grid items-end gap-1.5 ${
                reportMode === "week" ? "h-56 grid-cols-7" : "h-56 grid-cols-[repeat(31,minmax(0,1fr))]"
              }`}
            >
              {report.days.map((day) => (
                <div key={day.key} className="flex h-full min-w-0 flex-col justify-end gap-1">
                  <div className="relative flex min-h-1 flex-1 items-end overflow-hidden rounded-t-md bg-white/[0.035]">
                    {day.total > 0 && (
                      <div className="absolute inset-x-0 bottom-0">
                        <div
                          className="bg-red-400/55"
                          style={{ height: `${Math.max(3, (day.notDone / day.total) * 180)}px` }}
                        />
                        <div
                          className="bg-gradient-to-t from-green-500 to-green-300"
                          style={{ height: `${Math.max(day.done ? 3 : 0, (day.done / day.total) * 180)}px` }}
                        />
                      </div>
                    )}
                  </div>
                  {(reportMode === "week" ||
                    dateFromKey(day.key).getDate() === 1 ||
                    dateFromKey(day.key).getDate() % 5 === 0) && (
                    <span className="truncate text-center text-[9px] text-gray-600">
                      {reportMode === "week"
                        ? dateFromKey(day.key).toLocaleDateString("en-IN", { weekday: "narrow" })
                        : dateFromKey(day.key).getDate()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Needs attention</h3>
                <p className="mt-1 text-xs text-gray-600">Items marked not done</p>
              </div>
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-300">
                {report.notDone}
              </span>
            </div>

            {report.missedItems.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl text-green-300">✓</p>
                <p className="mt-2 text-sm font-medium text-gray-300">Nothing missed</p>
                <p className="mt-1 text-xs text-gray-600">Keep the momentum going.</p>
              </div>
            ) : (
              <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                {report.missedItems.map((item) => (
                  <li key={`${item.dateKey}-${item.id}`} className="rounded-xl bg-red-500/[0.055] p-3">
                    <p className="text-sm text-red-100">{item.title}</p>
                    <p className="mt-1 text-[11px] text-red-300/50">
                      {dateFromKey(item.dateKey).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid gap-5 border-t border-amber-300/10 p-5 lg:grid-cols-2 sm:p-6">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <h3 className="font-semibold text-white">Execution quality</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Top 3 completion</p><p className="mt-1 text-xl font-bold text-amber-200">{report.topThreeRate === null ? "No data" : `${report.topThreeRate}%`}</p></div>
              <div><p className="text-gray-500">Critical completion</p><p className="mt-1 text-xl font-bold text-red-200">{report.criticalRate === null ? "No data" : `${report.criticalRate}%`}</p></div>
              <div><p className="text-gray-500">Completion streak</p><p className="mt-1 text-xl font-bold text-green-300">{report.streak} days</p></div>
              <div><p className="text-gray-500">Previous period</p><p className="mt-1 text-xl font-bold text-sky-300">{report.completionChange === null ? "No data" : `${report.completionChange >= 0 ? "+" : ""}${report.completionChange}%`}</p></div>
              <div><p className="text-gray-500">Weakest day</p><p className="mt-1 font-semibold text-gray-200">{report.weakestDay ? dateFromKey(report.weakestDay.key).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "No data"}</p></div>
              <div><p className="text-gray-500">Target vs actual</p><p className="mt-1 font-semibold text-gray-200">{report.numericTotals.actual} / {report.numericTotals.target}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <h3 className="font-semibold text-white">Patterns requiring attention</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-gray-500">Most common missed reason</dt><dd className="mt-1 text-gray-200">{report.commonMissedReason ? `${MISSED_REASONS.find(([code]) => code === report.commonMissedReason![0])?.[1] || report.commonMissedReason[0]} (${report.commonMissedReason[1]})` : "No reasons recorded"}</dd></div>
              <div><dt className="text-gray-500">Most frequently missed item</dt><dd className="mt-1 text-gray-200">{report.frequentMissed ? `${report.frequentMissed[0]} (${report.frequentMissed[1]} times)` : "No repeated misses"}</dd></div>
              <div><dt className="text-gray-500">Unreviewed items</dt><dd className="mt-1 text-gray-200">{report.unreviewed.length}</dd></div>
              <div><dt className="text-gray-500">Rescheduled items</dt><dd className="mt-1 text-gray-200">{report.rescheduled.length}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 lg:col-span-2">
            <h3 className="font-semibold text-white">Completion by category</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.categoryPerformance.map((category) => (
                <div key={category.category} className="rounded-xl border border-white/8 p-3">
                  <div className="flex justify-between text-xs"><span className="text-gray-300">{category.category}</span><span className="text-gray-500">{category.completed}/{category.total}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-amber-300" style={{ width: `${category.rate}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          {reportMode === "month" && (
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-semibold text-white">Week-by-week comparison</h3><p className="mt-1 text-xs text-gray-600">Weeks are calendar-day groups within the selected month.</p></div>
                <p className="text-xs text-gray-400">Best: <span className="text-green-300">{report.bestWeek?.label || "No data"}</span> · Weakest: <span className="text-red-300">{report.weakestWeek?.label || "No data"}</span></p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {report.weeklyComparison.map((week) => (
                  <div key={week.label} className="rounded-xl border border-white/8 p-3">
                    <p className="text-xs text-gray-500">{week.label}</p><p className="mt-1 text-xl font-bold text-white">{week.completionRate}%</p><p className="text-[11px] text-gray-600">{week.done}/{week.total} completed · score {week.score}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.revenueActivity.length > 0 && (
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.03] p-4 lg:col-span-2">
              <h3 className="font-semibold text-white">Founder Revenue Activity</h3>
              <p className="mt-1 text-xs text-gray-600">Source: numeric actual values recorded on matching checklist items. CRM values are not inferred.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {report.revenueActivity.map((activity) => <div key={activity.label} className="rounded-xl bg-black/20 p-3"><p className="text-xs text-gray-500">{activity.label}</p><p className="mt-1 text-xl font-bold text-amber-200">{activity.value}</p></div>)}
              </div>
            </div>
          )}
          {(report.unreviewed.length > 0 || report.rescheduled.length > 0) && (
            <div className="grid gap-4 lg:col-span-2 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><h3 className="font-semibold text-white">Unreviewed items</h3><ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm text-gray-400">{report.unreviewed.length ? report.unreviewed.map((item) => <li key={`${item.dateKey}-${item.id}`}>{item.title} <span className="text-xs text-gray-600">· {item.dateKey}</span></li>) : <li>None</li>}</ul></div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><h3 className="font-semibold text-white">Rescheduled items</h3><ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm text-gray-400">{report.rescheduled.length ? report.rescheduled.map((item) => <li key={`${item.dateKey}-${item.id}`}>{item.title} <span className="text-xs text-gray-600">· {item.dateKey}</span></li>) : <li>None</li>}</ul></div>
            </div>
          )}
        </div>

        <div className="border-t border-amber-300/10 p-5 sm:p-6">
          <h3 className="font-semibold text-white">{reportMode === "week" ? "Weekly" : "Monthly"} reflection</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {([["what_worked", "What worked?"], ["what_failed", "What failed?"], ["next_change", reportMode === "week" ? "What will change next week?" : "What will change next month?"]] as const).map(([field, label]) => (
              <label key={field} className="text-xs text-gray-400">{label}<textarea rows={4} value={reportReflection[field]} onChange={(event) => setReportReflection((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white" /></label>
            ))}
          </div>
          {reportMode === "month" && <label className="mt-3 block text-xs text-gray-400">Three priorities for next month (one per line)<textarea rows={3} value={reportReflection.next_priorities} onChange={(event) => setReportReflection((current) => ({ ...current, next_priorities: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white" /></label>}
          <button onClick={saveReportReflection} disabled={saving || !databaseReady} className="mt-3 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">Save report reflection</button>
        </div>

        <div className="grid gap-px border-t border-amber-300/10 bg-amber-300/10 sm:grid-cols-4">
          <div className="bg-[#0d0c09] p-5">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="mt-1 text-2xl font-bold text-green-300">{report.done}</p>
          </div>
          <div className="bg-[#0d0c09] p-5">
            <p className="text-sm text-gray-500">Not done</p>
            <p className="mt-1 text-2xl font-bold text-red-300">{report.notDone}</p>
          </div>
          <div className="bg-[#0d0c09] p-5">
            <p className="text-sm text-gray-500">Skipped</p>
            <p className="mt-1 text-2xl font-bold text-gray-300">{report.skipped}</p>
          </div>
          <div className="bg-[#0d0c09] p-5">
            <p className="text-sm text-gray-500">Pending review</p>
            <p className="mt-1 text-2xl font-bold text-gray-300">{report.pending}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
