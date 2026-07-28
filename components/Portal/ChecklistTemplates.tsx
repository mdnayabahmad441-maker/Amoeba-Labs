"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChecklistCategory, ChecklistPriority } from "@/lib/daily-checklist";

type TemplateItem = {
  id: string; title: string; description: string | null; category: ChecklistCategory;
  priority: ChecklistPriority; scheduled_time: string | null; target_value: number | null;
  unit: string | null; top_three_eligible: boolean; sort_order: number;
  archived_at?: string | null;
};
type Template = {
  id: string; name: string; description: string | null; template_type: string;
  is_active: boolean; recurrence_type: string; recurrence_days: number[];
  specific_date: string | null; archived_at: string | null; checklist_template_items: TemplateItem[];
};

const STARTER_ITEMS: Array<Omit<TemplateItem, "id">> = [
  ["Offer all 5 Salah", "Faith", "Critical", 5, "Count"],
  ["Complete workout or recovery walk", "Fitness", "Important", 1, "Count"],
  ["Follow diet and protein target", "Fitness", "Important", 1, "Count"],
  ["Drink 2.5–3 litres of water", "Fitness", "Important", 2.5, "Litres"],
  ["Record one fitness clip", "Content", "Optional", 1, "Count"],
  ["Sleep at least 7 hours including nap", "Fitness", "Important", 7, "Hours"],
  ["Write today’s Top 3", "Administration", "Critical", 3, "Count"],
  ["Send 20 targeted outreaches", "Sales", "Critical", 20, "Count"],
  ["Make 5 prospect calls", "Sales", "Critical", 5, "Count"],
  ["Complete all due follow-ups", "Follow-ups", "Critical", null, null],
  ["Book or conduct at least 1 meeting/demo", "Sales", "Critical", 1, "Count"],
  ["Complete 2 hours of client delivery", "Client Delivery", "Critical", 2, "Hours"],
  ["Improve the Groenics offer or product", "Product", "Important", null, null],
  ["Research one real business problem", "Learning", "Important", 1, "Count"],
  ["Update CRM and all next actions", "Administration", "Important", null, null],
  ["Check proposals, invoices and pending payments", "Administration", "Important", null, null],
  ["Capture 3–5 raw clips", "Content", "Important", 3, "Count"],
  ["Write one content hook", "Content", "Important", 1, "Count"],
  ["Create or edit one content piece", "Content", "Important", 1, "Count"],
  ["Publish scheduled content", "Content", "Important", 1, "Count"],
  ["Reply to comments and DMs", "Content", "Optional", null, null],
  ["Record revenue and expenses", "Administration", "Important", null, null],
  ["Write today’s biggest win", "Personal", "Important", null, null],
  ["Record one lesson or mistake", "Learning", "Important", null, null],
  ["Review missed items", "Administration", "Important", null, null],
  ["Set tomorrow’s Top 3", "Administration", "Critical", 3, "Count"],
].map(([title, category, priority, target_value, unit], sort_order) => ({
  title: title as string, description: null, category: category as ChecklistCategory,
  priority: priority as ChecklistPriority, scheduled_time: null,
  target_value: target_value as number | null, unit: unit as string | null,
  top_three_eligible: title === "Write today’s Top 3" || title === "Set tomorrow’s Top 3", sort_order,
}));

function appliesOn(template: Template, dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00+05:30`);
  const weekday = date.getDay();
  if (template.recurrence_type === "daily") return true;
  if (template.recurrence_type === "weekdays") return template.recurrence_days.includes(weekday);
  if (template.recurrence_type === "weekly") return template.recurrence_days[0] === weekday;
  if (template.recurrence_type === "specific_date") return template.specific_date === dateKey;
  if (template.recurrence_type === "custom_days") return template.recurrence_days.includes(weekday);
  return false;
}

export default function ChecklistTemplates({ selectedDate, onApplied }: { selectedDate: string; onApplied: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTemplates() {
    const { data, error } = await supabase.from("checklist_templates")
      .select("*,checklist_template_items(*)").is("archived_at", null).order("created_at");
    if (error) { setMessage(error.message); setLoading(false); return; }
    const loaded = (data || []) as Template[];
    loaded.forEach((template) => {
      template.checklist_template_items = template.checklist_template_items
        .filter((item) => !item.archived_at)
        .sort((a, b) => a.sort_order - b.sort_order);
    });
    setTemplates(loaded); setLoading(false);

    const active = loaded.filter((template) => template.is_active && appliesOn(template, selectedDate));
    for (const template of active) await applyTemplate(template, true);
  }

  useEffect(() => {
    const timer = window.setTimeout(loadTemplates, 0);
    return () => window.clearTimeout(timer);
  // Automatic generation reruns only when the logical date changes; the unique
  // database index makes retries idempotent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function applyTemplate(template: Template, automatic = false) {
    if (!automatic && !window.confirm(`Apply ${template.name} to ${selectedDate}? ${template.checklist_template_items.length} items will be checked for generation.`)) return;
    const rows = template.checklist_template_items.map((item) => ({
      checklist_date: selectedDate, title: item.title, description: item.description,
      category: item.category, priority: item.priority, scheduled_time: item.scheduled_time,
      target_value: item.target_value, unit: item.unit, source_template_id: template.id,
      source_template_item_id: item.id, status: "pending",
    }));
    if (!rows.length) return;
    const { error } = await supabase.from("daily_checklist_items")
      .upsert(rows, { onConflict: "user_id,checklist_date,source_template_item_id", ignoreDuplicates: true });
    if (error) { setMessage(error.message); return; }
    if (!automatic) setMessage("Template applied. Existing generated items were not duplicated.");
    onApplied();
  }

  async function createStarter() {
    const { data, error } = await supabase.from("checklist_templates").upsert({
      name: "Groenics Founder Daily System", description: "Editable founder routine for faith, fitness, revenue, content and evening review.",
      template_type: "Regular Office Day", is_active: false, recurrence_type: "daily", is_starter: true,
    }, { onConflict: "user_id,name" }).select("id").single();
    if (error) { setMessage(error.message); return; }
    const { error: itemError } = await supabase.from("checklist_template_items")
      .upsert(STARTER_ITEMS.map((item) => ({ ...item, template_id: data.id })), { onConflict: "template_id,sort_order" });
    if (itemError) { setMessage(itemError.message); return; }
    setMessage("Starter template created but not activated."); await loadTemplates();
  }

  async function toggleActive(template: Template) {
    const { error } = await supabase.from("checklist_templates").update({ is_active: !template.is_active }).eq("id", template.id);
    if (error) setMessage(error.message); else await loadTemplates();
  }

  async function createCustom() {
    const name = window.prompt("Custom template name");
    if (!name?.trim()) return;
    const type = window.prompt(
      "Template type: Regular Office Day, School Field-Visit Day, Restaurant/Business Field-Visit Day, Friday Schedule, Sunday Review Day, or Custom Template",
      "Custom Template",
    ) || "Custom Template";
    const { data, error } = await supabase.from("checklist_templates").insert({
      name: name.trim(), template_type: type.trim(), recurrence_type: "manual", is_active: false,
    }).select("id").single();
    if (error) { setMessage(error.message); return; }
    await loadTemplates();
    setMessage("Custom template created. Open Preview / edit to add its items.");
    const created = templates.find((template) => template.id === data.id);
    if (created) setSelected(created);
  }

  async function editSchedule(template: Template) {
    const recurrence = window.prompt(
      "Recurrence: manual, daily, weekdays, weekly, specific_date, custom_days",
      template.recurrence_type,
    );
    if (!recurrence || !["manual", "daily", "weekdays", "weekly", "specific_date", "custom_days"].includes(recurrence)) return;
    let recurrenceDays = template.recurrence_days;
    let specificDate = template.specific_date;
    if (["weekdays", "weekly", "custom_days"].includes(recurrence)) {
      const entered = window.prompt("Weekdays as numbers: Sunday 0 through Saturday 6, comma separated", recurrenceDays.join(","));
      recurrenceDays = (entered || "").split(",").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    }
    if (recurrence === "specific_date") specificDate = window.prompt("Specific date (YYYY-MM-DD)", specificDate || selectedDate);
    const { error } = await supabase.from("checklist_templates").update({
      recurrence_type: recurrence, recurrence_days: recurrenceDays, specific_date: specificDate,
    }).eq("id", template.id);
    if (error) setMessage(error.message); else { setSelected(null); await loadTemplates(); }
  }

  async function editTemplateDetails(template: Template) {
    const name = window.prompt("Template name", template.name);
    if (!name?.trim()) return;
    const description = window.prompt("Template description", template.description || "") || null;
    const type = window.prompt("Template type", template.template_type) || template.template_type;
    const { error } = await supabase.from("checklist_templates").update({
      name: name.trim(), description, template_type: type.trim(),
    }).eq("id", template.id);
    if (error) setMessage(error.message); else { setSelected(null); await loadTemplates(); }
  }

  async function addTemplateItem(template: Template) {
    const title = window.prompt("Checklist item title");
    if (!title?.trim()) return;
    const category = window.prompt("Category", "Uncategorized") || "Uncategorized";
    const priority = window.prompt("Priority: Critical, Important or Optional", "Important") || "Important";
    const description = window.prompt("Optional description", "") || null;
    const scheduledTime = window.prompt("Optional default time (HH:MM)", "") || null;
    const targetText = window.prompt("Optional numeric target", "");
    const unit = targetText ? window.prompt("Unit", "Count") : null;
    const topThreeEligible = window.confirm("Can this item be selected as a Top 3 priority?");
    const { error } = await supabase.from("checklist_template_items").insert({
      template_id: template.id, title: title.trim(), description, category, priority,
      scheduled_time: scheduledTime,
      target_value: targetText ? Number(targetText) : null, unit,
      top_three_eligible: topThreeEligible,
      sort_order: template.checklist_template_items.length
        ? Math.max(...template.checklist_template_items.map((item) => item.sort_order)) + 1 : 0,
    });
    if (error) { setMessage(error.message); return; }
    setSelected(null); await loadTemplates(); setMessage("Template item added.");
  }

  async function editTemplateItem(item: TemplateItem) {
    const title = window.prompt("Edit checklist item title", item.title);
    if (!title?.trim()) return;
    const category = window.prompt("Category", item.category) || item.category;
    const priority = window.prompt("Priority", item.priority) || item.priority;
    const description = window.prompt("Optional description", item.description || "") || null;
    const scheduledTime = window.prompt("Optional default time (HH:MM)", item.scheduled_time || "") || null;
    const targetText = window.prompt("Optional numeric target", item.target_value?.toString() || "");
    const unit = targetText ? window.prompt("Unit", item.unit || "Count") : null;
    const topThreeEligible = window.confirm("Can this item be selected as a Top 3 priority?");
    const { error } = await supabase.from("checklist_template_items").update({
      title: title.trim(), description, category, priority, scheduled_time: scheduledTime,
      target_value: targetText ? Number(targetText) : null, unit,
      top_three_eligible: topThreeEligible,
    }).eq("id", item.id);
    if (error) setMessage(error.message); else { setSelected(null); await loadTemplates(); }
  }

  async function removeTemplateItem(item: TemplateItem) {
    if (!window.confirm(`Remove "${item.title}" from this template? Historical generated items remain.`)) return;
    const { error } = await supabase.from("checklist_template_items")
      .update({ archived_at: new Date().toISOString() }).eq("id", item.id);
    if (error) setMessage(error.message); else { setSelected(null); await loadTemplates(); }
  }

  async function archive(template: Template) {
    if (!window.confirm(`Archive ${template.name}? Previously generated checklist history will remain.`)) return;
    const { error } = await supabase.from("checklist_templates").update({ archived_at: new Date().toISOString(), is_active: false }).eq("id", template.id);
    if (error) setMessage(error.message); else { setSelected(null); await loadTemplates(); }
  }

  async function deleteTemplate(template: Template) {
    if (!window.confirm(`Permanently delete "${template.name}" and all of its template definitions? Previously generated daily checklist history will remain, but this template cannot be recovered.`)) return;
    const confirmation = window.prompt(`Type DELETE to permanently remove "${template.name}".`);
    if (confirmation !== "DELETE") return;
    const { error } = await supabase.from("checklist_templates").delete().eq("id", template.id);
    if (error) setMessage(error.message);
    else {
      setSelected(null);
      setMessage("Template permanently deleted. Generated checklist history was preserved.");
      await loadTemplates();
    }
  }

  return (
    <section className="rounded-3xl border border-amber-300/15 bg-[#0d0c09] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/70">Routines</p><h2 className="mt-2 text-xl font-bold text-white">Checklist templates</h2></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={createCustom} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-200">New custom template</button>
          {!templates.some((template) => template.name === "Groenics Founder Daily System") && <button onClick={createStarter} className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-black">Add founder starter</button>}
        </div>
      </div>
      {message && <p className="mt-3 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">{message}</p>}
      {loading ? <p className="mt-5 text-sm text-gray-500">Loading templates…</p> : templates.length === 0 ? <p className="mt-5 text-sm text-gray-500">No templates yet. Add the optional founder starter to begin.</p> : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{templates.map((template) => (
          <article key={template.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{template.name}</h3><p className="mt-1 text-xs text-gray-500">{template.checklist_template_items.length} items · {template.recurrence_type.replace("_", " ")}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${template.is_active ? "bg-green-400/10 text-green-300" : "bg-white/5 text-gray-500"}`}>{template.is_active ? "Active" : "Inactive"}</span></div>
            <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSelected(template)} className="rounded-lg bg-white/8 px-3 py-2 text-xs text-gray-200">Preview / items</button><button onClick={() => editTemplateDetails(template)} className="rounded-lg bg-white/8 px-3 py-2 text-xs text-gray-200">Edit details</button><button onClick={() => applyTemplate(template)} className="rounded-lg bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200">Apply to date</button><button onClick={() => editSchedule(template)} className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-300">Recurrence</button><button onClick={() => toggleActive(template)} className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-300">{template.is_active ? "Deactivate" : "Activate"}</button><button onClick={() => archive(template)} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">Archive</button><button onClick={() => deleteTemplate(template)} className="rounded-lg border border-red-500/25 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200">Delete permanently</button></div>
          </article>
        ))}</div>
      )}
      {selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-300/20 bg-[#11100d] p-5"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">{selected.name}</h3><p className="text-xs text-gray-500">{selected.recurrence_type.replace("_", " ")}</p></div><button onClick={() => setSelected(null)} aria-label="Close preview" className="p-2 text-gray-400">×</button></div><button onClick={() => addTemplateItem(selected)} className="mt-4 rounded-lg bg-white/8 px-3 py-2 text-xs text-gray-200">+ Add template item</button><ul className="mt-4 space-y-2">{selected.checklist_template_items.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/8 p-3 text-sm text-gray-200"><span>{item.title}<span className="ml-2 text-xs text-gray-600">{item.category} · {item.priority}{item.target_value !== null ? ` · ${item.target_value} ${item.unit || ""}` : ""}</span></span><span className="flex shrink-0 gap-1"><button onClick={() => editTemplateItem(item)} className="rounded bg-white/8 px-2 py-1 text-[11px]">Edit</button><button onClick={() => removeTemplateItem(item)} className="rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-300">Remove</button></span></li>)}</ul><button onClick={() => applyTemplate(selected)} className="mt-5 w-full rounded-xl bg-amber-300 py-3 font-bold text-black">Apply to {selectedDate}</button></div></div>}
    </section>
  );
}
