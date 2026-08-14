"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { indiaDateKey, mondayOf } from "@/lib/weekly-execution";

type TodayCell = {
  id: string;
  is_completed: boolean;
  is_not_applicable: boolean;
  note: string | null;
  checklist_week_tasks: {
    task_name_snapshot: string;
    category_snapshot: string;
    priority_snapshot: string;
    target_value_snapshot: number | null;
    unit_snapshot: string | null;
  };
};

export default function TodayChecklistPanel() {
  const [cells, setCells] = useState<TodayCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const date = indiaDateKey();

  const load = useCallback(async () => {
    setLoading(true);
    const setup = await supabase.rpc("setup_default_weekly_routine");
    if (setup.error) {
      setError("Run WEEKLY_EXECUTION_SHEET_UPGRADE.sql to show today’s checklist.");
      setLoading(false);
      return;
    }
    await supabase.rpc("generate_checklist_week", { requested_date: mondayOf(date) });
    const { data, error: loadError } = await supabase.from("checklist_week_cells")
      .select("id,is_completed,is_not_applicable,note,checklist_week_tasks!inner(task_name_snapshot,category_snapshot,priority_snapshot,target_value_snapshot,unit_snapshot)")
      .eq("execution_date", date).eq("is_scheduled", true).is("deleted_at", null)
      .order("created_at");
    if (loadError) setError(loadError.message);
    else setCells((data || []) as unknown as TodayCell[]);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function toggle(cell: TodayCell) {
    if (cell.is_not_applicable) return;
    const completed = !cell.is_completed;
    setSavingId(cell.id);
    setCells((current) => current.map((entry) =>
      entry.id === cell.id ? { ...entry, is_completed: completed } : entry,
    ));
    const { error: saveError } = await supabase.from("checklist_week_cells").update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", cell.id);
    if (saveError) {
      setError(saveError.message);
      await load();
    }
    setSavingId("");
  }

  const applicable = useMemo(() => cells.filter((cell) => !cell.is_not_applicable), [cells]);
  const completed = applicable.filter((cell) => cell.is_completed).length;
  const percent = applicable.length ? Math.round(completed / applicable.length * 100) : 0;
  const orderedCells = useMemo(() => cells.slice().sort((a, b) =>
    Number(a.is_completed) - Number(b.is_completed) ||
    a.checklist_week_tasks.category_snapshot.localeCompare(b.checklist_week_tasks.category_snapshot),
  ), [cells]);
  const displayedCells = expanded ? orderedCells : orderedCells.slice(0, 6);

  return (
    <section className="rounded-xl border border-emerald-300/15 bg-emerald-950/[0.06] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-white">Today’s checklist</h2>
            <span className="text-xs text-gray-600">Auto-fetched from weekly sheet</span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">Tick here; the weekly sheet updates immediately.</p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <p className="font-bold text-emerald-300">{completed}/{applicable.length} · {percent}%</p>
          {cells.length > 6 && <button onClick={() => setExpanded((value) => !value)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300">{expanded ? "Collapse" : `Show all ${cells.length}`}</button>}
          <Link href="/portal/daily-checklist" className="text-xs text-amber-200 hover:text-amber-100">Weekly sheet →</Link>
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">{error}</p>}
      {loading ? <p className="py-6 text-center text-sm text-gray-500">Loading today’s routine…</p> :
        cells.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-500">No checklist routine is scheduled for today.</p> :
        <div className={`mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3 ${expanded ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}>
          {displayedCells.map((cell) => {
              const task = cell.checklist_week_tasks;
              return <label key={cell.id} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 ${cell.is_completed ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-white/8 bg-black/15"} ${cell.is_not_applicable ? "cursor-default opacity-50" : ""}`}>
                <input type="checkbox" disabled={savingId === cell.id || cell.is_not_applicable} checked={cell.is_completed} onChange={() => toggle(cell)} className="h-4 w-4 shrink-0 accent-emerald-400"/>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-xs ${cell.is_completed ? "text-gray-500 line-through" : "text-gray-100"}`}>{task.task_name_snapshot}</span>
                  <span className="block truncate text-[9px] text-gray-600">{task.category_snapshot} · {task.priority_snapshot}{task.target_value_snapshot !== null ? ` · ${task.target_value_snapshot} ${task.unit_snapshot || ""}` : ""}{cell.note ? " · Note" : ""}</span>
                </span>
                {cell.is_not_applicable && <span className="text-[10px] text-gray-500">N/A</span>}
              </label>;
            })}
        </div>}
    </section>
  );
}
