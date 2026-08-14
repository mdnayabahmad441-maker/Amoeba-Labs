"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CHECKLIST_CATEGORIES, CHECKLIST_PRIORITIES, CHECKLIST_UNITS } from "@/lib/daily-checklist";
import { executionMetrics, indiaDateKey, mondayOf, moveDateKey, parseWeeklyExecutionCsv } from "@/lib/weekly-execution";

type Cell = {
  id: string; execution_date: string; is_scheduled: boolean; is_completed: boolean;
  is_not_applicable: boolean; is_top_three: boolean; note: string | null; deleted_at: string | null;
};
type WeekTask = {
  id: string; task_id: string | null; task_name_snapshot: string; category_snapshot: string;
  priority_snapshot: "Critical" | "Important" | "Optional"; target_value_snapshot: number | null;
  unit_snapshot: string | null; sort_order: number; checklist_week_cells: Cell[];
};
type RoutineDay = { id: string; task_id: string; weekday: number; is_active: boolean };
type Task = { id: string; name: string; category: string; priority: string; default_target_value: number | null; default_unit: string | null; checklist_routine_days: RoutineDay[] };

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const shortMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function prettyDate(key: string) { return shortMonth.format(new Date(`${key}T12:00:00Z`)).toUpperCase(); }

export default function WeeklyExecutionSheet() {
  const [weekStart,setWeekStart]=useState(()=>mondayOf(indiaDateKey()));
  const [tasks,setTasks]=useState<WeekTask[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [addOpen,setAddOpen]=useState(false);
  const [routineOpen,setRoutineOpen]=useState(false);
  const [grouped,setGrouped]=useState(true);
  const [categoryFilter,setCategoryFilter]=useState("All");
  const [menuCell,setMenuCell]=useState<Cell|null>(null);
  const [routine,setRoutine]=useState<Task[]>([]);
  const [importing,setImporting]=useState(false);
  const [selectedTaskIds,setSelectedTaskIds]=useState<Set<string>>(new Set());
  const scrollRef=useRef<HTMLDivElement>(null);
  const today=indiaDateKey();
  const dates=useMemo(()=>DAYS.map((_,i)=>moveDateKey(weekStart,i)),[weekStart]);

  const load=useCallback(async()=>{
    setLoading(true); setMessage("");
    const setup=await supabase.rpc("setup_default_weekly_routine");
    if(setup.error){setMessage("Run WEEKLY_EXECUTION_SHEET_UPGRADE.sql in Supabase to enable the weekly sheet.");setLoading(false);return;}
    const generated=await supabase.rpc("generate_checklist_week",{requested_date:weekStart});
    if(generated.error){setMessage(generated.error.message);setLoading(false);return;}
    const {data,error}=await supabase.from("checklist_week_tasks")
      .select("id,task_id,task_name_snapshot,category_snapshot,priority_snapshot,target_value_snapshot,unit_snapshot,sort_order,checklist_week_cells(id,execution_date,is_scheduled,is_completed,is_not_applicable,is_top_three,note,deleted_at)")
      .eq("week_start_date",weekStart).is("deleted_at",null).order("sort_order");
    if(error)setMessage(error.message); else setTasks(((data||[]) as WeekTask[]).map(t=>({...t,checklist_week_cells:t.checklist_week_cells.filter(c=>!c.deleted_at)})));
    setSelectedTaskIds(new Set());
    setLoading(false);
  },[weekStart]);
  useEffect(()=>{const timer=window.setTimeout(load,0);return()=>window.clearTimeout(timer);},[load]);

  async function toggle(cell:Cell){
    if(cell.execution_date<today){setMessage("Past days are read-only.");return;}
    if(cell.execution_date>today){setMessage("Future tasks can be planned, but they cannot be ticked before that day.");return;}
    const completed=!cell.is_completed;
    setTasks(current=>current.map(task=>({...task,checklist_week_cells:task.checklist_week_cells.map(c=>c.id===cell.id?{...c,is_completed:completed,is_not_applicable:false}:c)})));
    const {error}=await supabase.from("checklist_week_cells").update({is_completed:completed,is_not_applicable:false,completed_at:completed?new Date().toISOString():null}).eq("id",cell.id);
    if(error){setMessage(error.message);await load();}
  }
  async function addUnscheduled(task:WeekTask,date:string){
    if(date<today){setMessage("Past days are read-only.");return;}
    if(!window.confirm(`Add this task to ${DAYS[dates.indexOf(date)]}?`))return;
    const {error}=await supabase.from("checklist_week_cells").upsert({week_task_id:task.id,execution_date:date,is_scheduled:true},{onConflict:"user_id,week_task_id,execution_date"});
    if(error)setMessage(error.message);else await load();
  }
  async function updateCell(cell:Cell,changes:Partial<Cell>){
    if(cell.execution_date<today){setMessage("Past days are read-only.");setMenuCell(null);return;}
    const {error}=await supabase.from("checklist_week_cells").update(changes).eq("id",cell.id);
    if(error)setMessage(error.message);else{setMenuCell(null);await load();}
  }
  async function cellAction(action:string){
    if(!menuCell)return;
    if(action==="top")await updateCell(menuCell,{is_top_three:!menuCell.is_top_three});
    if(action==="remove"&&window.confirm("Remove this task from this day only?"))await updateCell(menuCell,{deleted_at:new Date().toISOString()});
    if(action==="na"){const reason=window.prompt("Optional reason this is not applicable today",menuCell.note||"");if(reason!==null)await updateCell(menuCell,{is_not_applicable:true,is_completed:false,note:reason||null});}
    if(action==="note"){const note=window.prompt("Short note",menuCell.note||"");if(note!==null)await updateCell(menuCell,{note:note||null});}
    if(action==="history"){const task=tasks.find(t=>t.checklist_week_cells.some(c=>c.id===menuCell.id));if(task)window.alert(`${task.task_name_snapshot}\n${menuCell.execution_date}\n${menuCell.is_completed?"Completed":menuCell.is_not_applicable?"Not applicable":"Incomplete"}${menuCell.note?`\nNote: ${menuCell.note}`:""}`);}
  }
  async function copyPrevious(){
    if(tasks.some(t=>t.checklist_week_cells.length)&&!window.confirm("This week already has tasks. Copy missing scheduled tasks from the previous week without replacing completion or notes?"))return;
    const {data,error}=await supabase.rpc("copy_previous_checklist_week",{target_week:weekStart});
    setMessage(error?.message||`${data||0} scheduled cells copied. Completion, notes and Top 3 were not copied.`);if(!error)await load();
  }
  async function importCsv(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setImporting(true);setMessage("");
    try{
      const parsed=parseWeeklyExecutionCsv(await file.text());
      const {data,error}=await supabase.rpc("import_checklist_week_tasks",{requested_week:weekStart,import_rows:parsed});
      if(error)throw error;
      setMessage(`${data} task row(s) imported successfully. Existing task-day cells were not duplicated.`);
      await load();
    }catch(caught){setMessage(caught instanceof Error?caught.message:"Unable to import this CSV file.");}
    finally{setImporting(false);}
  }
  async function loadRoutine(){
    const {data,error}=await supabase.from("checklist_tasks").select("id,name,category,priority,default_target_value,default_unit,checklist_routine_days(id,task_id,weekday,is_active)").is("archived_at",null).order("name");
    if(error)setMessage(error.message);else setRoutine((data||[]) as Task[]);setRoutineOpen(true);
  }
  async function permanentlyDeleteTask(task:WeekTask){
    if(!window.confirm(`Permanently delete "${task.task_name_snapshot}" from this weekly list?\n\nThis removes all seven cells for this week and cannot be undone. The recurring routine will not be changed.`))return;
    const confirmation=window.prompt('Type DELETE to confirm permanent removal.');
    if(confirmation!=="DELETE")return;
    const {error}=await supabase.rpc("permanently_delete_checklist_week_task",{target_week_task:task.id});
    if(error)setMessage(error.message);else{setMessage(`"${task.task_name_snapshot}" was permanently deleted from this week.`);await load();}
  }
  async function permanentlyDeleteSelected(){
    const selected=tasks.filter(task=>selectedTaskIds.has(task.id));
    if(!selected.length){setMessage("Select at least one task to delete.");return;}
    if(!window.confirm(`Permanently delete ${selected.length} selected task${selected.length===1?"":"s"} and all their cells from this weekly list?\n\nThis includes any past-day history for these selected rows and cannot be undone. Normal past-day editing remains locked.`))return;
    const confirmation=window.prompt("Type DELETE SELECTED to confirm.");
    if(confirmation!=="DELETE SELECTED")return;
    const {data,error}=await supabase.rpc("permanently_delete_checklist_week_tasks",{target_week_tasks:selected.map(task=>task.id)});
    if(error)setMessage(error.message);else{setMessage(`${data||0} selected task(s) were permanently deleted.`);await load();}
  }
  async function toggleRoutineDay(task:Task,weekday:number){
    const existing=task.checklist_routine_days.find(day=>day.weekday===weekday&&day.is_active);
    if(existing)await supabase.from("checklist_routine_days").update({is_active:false,effective_until:moveDateKey(weekStart,-1)}).eq("id",existing.id);
    else await supabase.from("checklist_routine_days").insert({task_id:task.id,weekday,default_target_value:task.default_target_value,default_unit:task.default_unit,effective_from:moveDateKey(weekStart,7)});
    await loadRoutine();
  }

  const metrics=useMemo(()=>dates.map(date=>{const m=executionMetrics(tasks.flatMap(t=>t.checklist_week_cells),date);return{scheduled:m.scheduled,done:m.completed,percent:m.percentage,topDone:m.topThreeCompleted,topTotal:m.topThreeTotal};}),[dates,tasks]);
  const weeklyScheduled=metrics.reduce((s,m)=>s+m.scheduled,0),weeklyDone=metrics.reduce((s,m)=>s+m.done,0);
  const weeklyPercent=weeklyScheduled?Math.round(weeklyDone/weeklyScheduled*100):0;
  const categories=useMemo(()=>["All",...Array.from(new Set(tasks.map(task=>task.category_snapshot))).sort()],[tasks]);
  const visibleTasks=useMemo(()=>categoryFilter==="All"?tasks:tasks.filter(task=>task.category_snapshot===categoryFilter),[categoryFilter,tasks]);
  const categoryGroups=useMemo(()=>{const groups=new Map<string,WeekTask[]>();visibleTasks.forEach(task=>{const key=grouped?task.category_snapshot:"All tasks";groups.set(key,[...(groups.get(key)||[]),task]);});return [...groups.entries()];},[grouped,visibleTasks]);
  const completedDays=metrics.map((m,i)=>({...m,i})).filter(m=>dates[m.i]<=today&&m.scheduled>0);
  const strongest=completedDays.slice().sort((a,b)=>(b.percent||0)-(a.percent||0))[0];
  const weakest=completedDays.slice().sort((a,b)=>(a.percent||0)-(b.percent||0))[0];

  function focusToday(){const index=dates.indexOf(today);if(index>=0&&scrollRef.current)scrollRef.current.scrollTo({left:280+index*118-80,behavior:"smooth"});}

  return <div className="mx-auto max-w-[1500px] space-y-4">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-emerald-300/70">Founder execution</p><h1 className="mt-2 text-3xl font-bold text-white">Weekly Execution Sheet</h1><p className="mt-1 text-sm text-gray-500">Monday, {prettyDate(dates[0])} – Sunday, {prettyDate(dates[6])} {dates[6].slice(0,4)}</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setWeekStart(moveDateKey(weekStart,-7))} className="control">← Previous</button>
        <button onClick={()=>setWeekStart(mondayOf(today))} className="control">This Week</button>
        <button onClick={()=>setWeekStart(moveDateKey(weekStart,7))} className="control">Next →</button>
        <input type="date" value={weekStart} onChange={e=>setWeekStart(mondayOf(e.target.value))} className="control"/>
        <button onClick={focusToday} className="control">Focus Today</button>
        <button onClick={()=>setAddOpen(true)} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-bold text-black">+ Add Task</button>
        <label className="control cursor-pointer">{importing?"Importing…":"Import CSV"}<input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={importing} className="sr-only"/></label>
        <a href="/weekly-execution-sheet-import-template.csv" download className="control">CSV Template</a>
        <button onClick={loadRoutine} className="control">Edit Routine</button>
        <button onClick={copyPrevious} className="control">Copy Previous Week</button>
      </div>
    </header>
    {message&&<p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[.025] px-3 py-2">
      <p className="text-sm text-gray-300"><strong className="text-emerald-300">Weekly Progress: {weeklyPercent}%</strong> · {weeklyDone}/{weeklyScheduled} completed · Top 3: {metrics.reduce((s,m)=>s+m.topDone,0)}/{metrics.reduce((s,m)=>s+m.topTotal,0)}{strongest?` · Strongest: ${DAYS[strongest.i]}`:""}{weakest?` · Weakest completed day: ${DAYS[weakest.i]}`:""}</p>
      <div className="flex items-center gap-2">
        {selectedTaskIds.size>0&&<button onClick={permanentlyDeleteSelected} className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">Delete selected ({selectedTaskIds.size})</button>}
        <label className="text-xs text-gray-500">Category</label>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="rounded-md border border-white/10 bg-[#101310] px-2 py-1.5 text-xs text-gray-200">
          {categories.map(category=><option key={category}>{category}</option>)}
        </select>
        <button onClick={()=>setGrouped(v=>!v)} className="rounded-md border border-white/10 px-2 py-1.5 text-xs text-gray-400">{grouped?"One list":"Group categories"}</button>
      </div>
    </div>
    {loading?<p className="py-16 text-center text-sm text-gray-500">Loading weekly routine…</p>:<div ref={scrollRef} className="max-w-full overflow-x-auto rounded-lg border border-white/15 bg-[#0b0e0b] shadow-[0_12px_40px_rgba(0,0,0,.25)]">
      <table className="w-full min-w-[1040px] border-collapse text-xs">
        <thead className="sticky top-0 z-30 bg-[#121512]"><tr>
          <th className="sticky left-0 z-40 w-10 min-w-10 border-b border-r border-white/15 bg-[#121512] p-2 text-center"><input type="checkbox" checked={visibleTasks.length>0&&visibleTasks.every(task=>selectedTaskIds.has(task.id))} onChange={e=>setSelectedTaskIds(current=>{const next=new Set(current);visibleTasks.forEach(task=>{if(e.target.checked)next.add(task.id);else next.delete(task.id);});return next;})} aria-label="Select all visible tasks" className="h-4 w-4 accent-red-400"/></th>
          <th className="sticky left-10 z-40 w-64 min-w-64 border-b border-r border-white/15 bg-[#121512] px-3 py-2 text-left">TASK</th>
          <th className="w-20 min-w-20 border-b border-r border-white/15 px-2 py-2 text-left">TARGET</th>
          <th className="w-16 min-w-16 border-b border-r border-white/15 px-2 py-2 text-center">DELETE</th>
          {DAYS.map((day,i)=><th key={day} className={`w-[108px] min-w-[108px] border-b border-r border-white/10 px-2 py-2 text-center last:border-r-0 ${dates[i]===today?"bg-emerald-400/[.1]":dates[i]<today?"bg-black/15":""}`}><span className="block text-[11px] text-white">{day.slice(0,3).toUpperCase()}</span><span className="block text-[9px] text-gray-500">{prettyDate(dates[i])}</span><span className="block text-[10px] text-emerald-300">{metrics[i].done}/{metrics[i].scheduled} · {metrics[i].percent===null?"—":`${metrics[i].percent}%`}</span><span className="block text-[8px] text-amber-200">★ {metrics[i].topDone}/{metrics[i].topTotal}</span></th>)}
        </tr></thead>
        <tbody>{categoryGroups.map(([category,rows])=><FragmentRows key={category} category={category} rows={rows} dates={dates} today={today} grouped={grouped} selectedTaskIds={selectedTaskIds} onSelect={task=>setSelectedTaskIds(current=>{const next=new Set(current);if(next.has(task.id))next.delete(task.id);else next.add(task.id);return next;})} onToggle={toggle} onAdd={addUnscheduled} onMenu={setMenuCell} onDelete={permanentlyDeleteTask}/>)}</tbody>
      </table>
    </div>}
    {metrics.map((m,i)=>m.scheduled===0?<p key={i} className="text-xs text-amber-200">{DAYS[i]}: No routine scheduled. This day has no active routine. Add at least the daily foundation.</p>:null)}
    {addOpen&&<AddTaskModal weekStart={weekStart} onClose={()=>setAddOpen(false)} onSaved={async()=>{setAddOpen(false);await load();}}/>}
    {routineOpen&&<RoutineDrawer tasks={routine} onClose={()=>setRoutineOpen(false)} onToggle={toggleRoutineDay}/>}
    {menuCell&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={()=>setMenuCell(null)}><div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#151813] p-3" onClick={e=>e.stopPropagation()}>{[["top",menuCell.is_top_three?"Remove from Daily Top 3":"Mark as Daily Top 3"],["na","Not applicable today"],["note","Add note"],["remove","Remove from this day"],["history","View history"]].map(([key,label])=><button key={key} onClick={()=>cellAction(key)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-white/8">{label}</button>)}</div></div>}
    <style jsx>{`.control{border:1px solid rgba(255,255,255,.1);border-radius:.75rem;padding:.625rem .85rem;background:rgba(255,255,255,.035);font-size:.8rem;color:#d1d5db}`}</style>
  </div>;
}

function FragmentRows({category,rows,dates,today,grouped,selectedTaskIds,onSelect,onToggle,onAdd,onMenu,onDelete}:{category:string;rows:WeekTask[];dates:string[];today:string;grouped:boolean;selectedTaskIds:Set<string>;onSelect:(t:WeekTask)=>void;onToggle:(c:Cell)=>void;onAdd:(t:WeekTask,d:string)=>void;onMenu:(c:Cell)=>void;onDelete:(t:WeekTask)=>void}){
  return <>{grouped&&<tr><td colSpan={11} className="border-b border-white/10 bg-white/[.045] px-3 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-gray-500">{category}</td></tr>}{rows.map(task=><tr key={task.id} className={`border-b border-white/10 hover:bg-white/[.02] ${selectedTaskIds.has(task.id)?"bg-red-500/[.035]":""}`}>
    <td className="sticky left-0 z-20 border-r border-white/10 bg-[#0e110e] text-center"><input type="checkbox" checked={selectedTaskIds.has(task.id)} onChange={()=>onSelect(task)} aria-label={`Select ${task.task_name_snapshot}`} className="h-4 w-4 accent-red-400"/></td>
    <th className="sticky left-10 z-20 border-r border-white/15 bg-[#0e110e] px-3 py-1.5 text-left"><span className="flex items-center gap-2 text-[11px] font-medium leading-tight text-gray-100"><span title={task.priority_snapshot} aria-label={`${task.priority_snapshot} priority`} className={`h-1.5 w-1.5 shrink-0 rounded-full ${task.priority_snapshot==="Critical"?"bg-orange-400":task.priority_snapshot==="Important"?"bg-amber-300":"bg-gray-500"}`}/><span className="min-w-0 flex-1">{task.task_name_snapshot}</span></span><span className="ml-3.5 block text-[8px] font-normal leading-tight text-gray-600">{task.category_snapshot}</span></th>
    <td className="border-r border-white/10 px-2 text-[10px] text-gray-400">{task.target_value_snapshot===null?"—":task.unit_snapshot==="Percentage"?`${task.target_value_snapshot}%`:`${task.target_value_snapshot} ${task.unit_snapshot||""}`}</td>
    <td className="border-r border-white/10 px-1 text-center"><button onClick={()=>onDelete(task)} title="Permanently delete this task" aria-label={`Permanently delete ${task.task_name_snapshot}`} className="rounded-md border border-red-500/20 bg-red-500/[.07] px-2 py-1.5 text-[9px] font-semibold text-red-300 hover:bg-red-500/15">Delete</button></td>
    {dates.map(date=>{const cell=task.checklist_week_cells.find(c=>c.execution_date===date&&c.is_scheduled);const past=date<today,future=date>today;return <td key={date} className={`group relative border-r border-white/10 px-1 py-1 text-center last:border-r-0 ${date===today?"bg-emerald-400/[.04]":past?"bg-black/10":""}`}>{cell?cell.is_not_applicable?<button disabled={past} onClick={()=>onMenu(cell)} className="h-8 rounded px-2 text-[10px] text-gray-500 disabled:cursor-not-allowed">N/A{cell.note&&<span className="ml-1 text-amber-300">•</span>}</button>:<div className="flex h-9 items-center justify-center"><button disabled={past||future} onClick={()=>onToggle(cell)} className={`flex h-7 w-7 items-center justify-center rounded-md border text-sm transition ${cell.is_completed?"border-emerald-300 bg-emerald-300 text-black":past||future?"cursor-not-allowed border-white/10 bg-white/[.015] text-transparent":"border-white/25 text-transparent hover:border-emerald-300/70"}`} title={past?"Past day — read only":future?"Future day — cannot complete yet":cell.is_completed?"Untick task":"Complete task"} aria-label={`${cell.is_completed?"Untick":"Complete"} ${task.task_name_snapshot} on ${date}`}>✓</button>{cell.is_top_three&&<span className="absolute left-1 top-0.5 text-[9px] text-amber-300">★</span>}{cell.note&&<span className="absolute bottom-0 left-1 text-amber-300">•</span>}{!past&&<button onClick={()=>onMenu(cell)} aria-label="Cell actions" className="absolute right-0.5 top-0 rounded px-1 text-[8px] text-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100">•••</button>}</div>:<button disabled={past} onClick={()=>onAdd(task,date)} className="h-8 w-full text-gray-700 hover:text-gray-400 disabled:cursor-not-allowed disabled:text-gray-800" title={past?"Past day — read only":`Add to ${date}`} aria-label={`Add ${task.task_name_snapshot} to ${date}`}>—</button>}</td>})}
  </tr>)}</>;
}

function AddTaskModal({weekStart,onClose,onSaved}:{weekStart:string;onClose:()=>void;onSaved:()=>void}){
  const [name,setName]=useState(""),[category,setCategory]=useState("Administration"),[priority,setPriority]=useState("Important"),[target,setTarget]=useState(""),[unit,setUnit]=useState(""),[days,setDays]=useState<number[]>([]),[repeat,setRepeat]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
  async function submit(e:FormEvent){e.preventDefault();if(!name.trim()||!days.length){setError("Enter a task name and select at least one day.");return;}setSaving(true);const result=await supabase.rpc("add_checklist_week_task",{requested_week:weekStart,task_name:name.trim(),task_category:category,task_priority:priority,task_target:target?Number(target):null,task_unit:unit||null,weekdays:days,repeat_future:repeat});if(result.error){setError(result.error.message);setSaving(false);}else onSaved();}
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-emerald-300/20 bg-[#121512] p-5"><div className="flex justify-between"><h2 className="text-lg font-bold text-white">Add Task</h2><button type="button" onClick={onClose} className="text-gray-500">×</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Task name" className="field sm:col-span-2"/><select value={category} onChange={e=>setCategory(e.target.value)} className="field">{CHECKLIST_CATEGORIES.filter(c=>c!=="Personal"&&c!=="Uncategorized").map(c=><option key={c}>{c}</option>)}</select><select value={priority} onChange={e=>setPriority(e.target.value)} className="field">{CHECKLIST_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select><input type="number" min="0" value={target} onChange={e=>setTarget(e.target.value)} placeholder="Target value" className="field"/><select value={unit} onChange={e=>setUnit(e.target.value)} className="field"><option value="">No unit</option>{CHECKLIST_UNITS.map(u=><option key={u}>{u}</option>)}</select></div><div className="mt-4 flex flex-wrap gap-2">{DAYS.map((day,i)=><label key={day} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs ${days.includes(i+1)?"border-emerald-300 bg-emerald-300/10 text-emerald-200":"border-white/10 text-gray-500"}`}><input type="checkbox" className="sr-only" checked={days.includes(i+1)} onChange={()=>setDays(v=>v.includes(i+1)?v.filter(d=>d!==i+1):[...v,i+1])}/>{day.slice(0,3)}</label>)}<button type="button" onClick={()=>setDays([1,2,3,4,5,6,7])} className="rounded-lg px-3 py-2 text-xs text-amber-200">Select all</button></div><label className="mt-4 flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)} className="accent-emerald-400"/>Repeat in future weeks</label>{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="control">Cancel</button><button disabled={saving} className="rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-bold text-black disabled:opacity-40">{saving?"Adding…":"Add Task"}</button></div><style jsx>{`.field{border:1px solid rgba(255,255,255,.1);border-radius:.65rem;background:#0b0d0b;padding:.7rem;color:white}.control{padding:.65rem 1rem;color:#aaa}`}</style></form></div>;
}

function RoutineDrawer({tasks,onClose,onToggle}:{tasks:Task[];onClose:()=>void;onToggle:(task:Task,day:number)=>void}){
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/60"><aside className="h-full w-full max-w-4xl overflow-auto border-l border-white/10 bg-[#101310] p-5"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-white">Edit Weekly Routine</h2><p className="text-sm text-gray-500">Changes apply from next week; previous weeks remain unchanged.</p></div><button onClick={onClose} className="text-2xl text-gray-500">×</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr><th className="p-3 text-left">Recurring task</th>{DAYS.map(d=><th key={d} className="p-2 text-xs">{d.slice(0,3)}</th>)}</tr></thead><tbody>{tasks.map(task=><tr key={task.id} className="border-t border-white/8"><td className="p-3"><span className="text-gray-200">{task.name}</span><small className="block text-gray-600">{task.category} · {task.default_target_value??"—"} {task.default_unit||""}</small></td>{DAYS.map((_,i)=>{const active=task.checklist_routine_days.some(day=>day.weekday===i+1&&day.is_active);return <td key={i} className="text-center"><button onClick={()=>onToggle(task,i+1)} className={`h-8 w-8 rounded-lg border ${active?"border-emerald-300 bg-emerald-300 text-black":"border-white/10 text-transparent"}`}>✓</button></td>})}</tr>)}</tbody></table></div></aside></div>;
}
