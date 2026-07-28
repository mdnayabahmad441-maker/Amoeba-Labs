"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CALENDAR_EVENT_STATUSES,
  CALENDAR_EVENT_TYPES,
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventType,
  Client,
  Employee,
  Lead,
  Project,
  RecurrenceFrequency,
  Venture,
} from "@/lib/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/Portal/States";
import Modal from "@/components/Portal/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import FollowupModal from "@/components/Portal/FollowupModal";

type ViewMode = "day" | "week" | "month" | "agenda";
type ReminderChannel = "Internal" | "Email draft" | "WhatsApp draft";
type EventRow = CalendarEvent & {
  related_name: string;
  employee_name: string;
  attendees: string[];
  reminders: string[];
};
type EventForm = {
  venture_id: string;
  title: string;
  event_type: CalendarEventType;
  description: string;
  start_at: string;
  end_at: string;
  timezone: string;
  all_day: boolean;
  location: string;
  meeting_link: string;
  status: CalendarEventStatus;
  priority: CalendarEvent["priority"];
  assigned_employee_id: string;
  related_lead_id: string;
  related_client_id: string;
  related_project_id: string;
  meeting_notes: string;
  outcome: string;
  cancellation_reason: string;
  recurrence_frequency: RecurrenceFrequency | "";
  recurrence_interval: number;
  recurrence_until: string;
  attendee_lines: string;
  reminder_minutes: string;
  reminder_channel: ReminderChannel;
  google_sync_status: CalendarEvent["google_sync_status"];
};

const pad = (value: number) => String(value).padStart(2, "0");
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
const startOfWeek = (date: Date) => {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};
const dateParts = (date: Date, timeZone: string) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
const zonedIsoToInput = (iso: string, timeZone: string) => {
  const parts = dateParts(new Date(iso), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const zonedInputToIso = (input: string, timeZone: string) => {
  const [date, time] = input.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const assumedUtc = Date.UTC(year, month - 1, day, hour, minute);
  const rendered = dateParts(new Date(assumedUtc), timeZone);
  const renderedAsUtc = Date.UTC(
    Number(rendered.year),
    Number(rendered.month) - 1,
    Number(rendered.day),
    Number(rendered.hour),
    Number(rendered.minute),
    Number(rendered.second)
  );
  return new Date(assumedUtc - (renderedAsUtc - assumedUtc)).toISOString();
};
const emptyForm = (timezone = "Asia/Kolkata"): EventForm => {
  const now = new Date();
  const date = localDate(now);
  return {
    venture_id: "",
    title: "",
    event_type: "Client meeting",
    description: "",
    start_at: `${date}T10:00`,
    end_at: `${date}T11:00`,
    timezone,
    all_day: false,
    location: "",
    meeting_link: "",
    status: "Scheduled",
    priority: "Medium",
    assigned_employee_id: "",
    related_lead_id: "",
    related_client_id: "",
    related_project_id: "",
    meeting_notes: "",
    outcome: "",
    cancellation_reason: "",
    recurrence_frequency: "",
    recurrence_interval: 1,
    recurrence_until: "",
    attendee_lines: "",
    reminder_minutes: "30",
    reminder_channel: "Internal",
    google_sync_status: "Not connected",
  };
};

export default function CalendarPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<ViewMode>("week");
  const [focusDate, setFocusDate] = useState("");
  const [ventureFilter, setVentureFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventForm>(() => emptyForm());
  const [followupEvent, setFollowupEvent] = useState<EventRow | null>(null);
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Kolkata");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ventureResult = await supabase
        .from("ventures")
        .select("*")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("venture_name");
      if (ventureResult.error) throw ventureResult.error;
      const ventureRows = (ventureResult.data || []) as Venture[];
      setVentures(ventureRows);
      const ventureIds = ventureRows.map((venture) => venture.id);
      if (!ventureIds.length) {
        setEvents([]);
        return;
      }

      const defaultVenture = ventureRows.find((venture) => venture.is_default) || ventureRows[0];
      const [employeeResult, clientResult, leadResult, projectResult, eventResult, settingsResult] =
        await Promise.all([
          supabase.from("employees").select("*").in("venture_id", ventureIds).eq("status", "Active").is("archived_at", null).order("is_founder", { ascending: false }).order("full_name"),
          supabase.from("clients").select("*").in("venture_id", ventureIds).is("archived_at", null).order("client_name"),
          supabase.from("leads").select("*").in("venture_id", ventureIds).is("archived_at", null).order("client_name"),
          supabase.from("projects").select("*").in("venture_id", ventureIds).is("archived_at", null).order("project_name"),
          supabase.from("calendar_events").select("*").in("venture_id", ventureIds).order("start_at"),
          supabase.from("business_settings").select("timezone").eq("venture_id", defaultVenture.id).maybeSingle(),
        ]);
      const failed = [employeeResult, clientResult, leadResult, projectResult, eventResult].find(
        (result) => result.error
      );
      if (failed?.error) throw failed.error;
      if (!settingsResult.error && settingsResult.data?.timezone) {
        setDefaultTimezone(settingsResult.data.timezone);
      }

      const employeeRows = (employeeResult.data || []) as Employee[];
      const clientRows = (clientResult.data || []) as Client[];
      const leadRows = (leadResult.data || []) as Lead[];
      const projectRows = (projectResult.data || []) as Project[];
      const eventRows = (eventResult.data || []) as CalendarEvent[];
      setEmployees(employeeRows);
      setClients(clientRows);
      setLeads(leadRows);
      setProjects(projectRows);

      const eventIds = eventRows.map((event) => event.id);
      const [attendeeResult, reminderResult] = eventIds.length
        ? await Promise.all([
            supabase.from("calendar_event_attendees").select("*").in("event_id", eventIds),
            supabase.from("calendar_event_reminders").select("*").in("event_id", eventIds),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      if (attendeeResult.error) throw attendeeResult.error;
      if (reminderResult.error) throw reminderResult.error;

      const employeeMap = new Map(employeeRows.map((employee) => [employee.id, employee.full_name]));
      const relatedMap = new Map<string, string>([
        ...clientRows.map((client) => [client.id, client.client_name] as [string, string]),
        ...leadRows.map((lead) => [lead.id, lead.client_name] as [string, string]),
        ...projectRows.map((project) => [project.id, project.project_name] as [string, string]),
      ]);
      setEvents(
        eventRows.map((event) => ({
          ...event,
          employee_name: event.assigned_employee_id
            ? employeeMap.get(event.assigned_employee_id) || "Unassigned"
            : "Unassigned",
          related_name:
            relatedMap.get(
              event.related_client_id || event.related_lead_id || event.related_project_id || ""
            ) || "",
          attendees: (attendeeResult.data || [])
            .filter((attendee) => attendee.event_id === event.id)
            .map((attendee) =>
              attendee.email ? `${attendee.name} <${attendee.email}>` : attendee.name
            ),
          reminders: (reminderResult.data || [])
            .filter((reminder) => reminder.event_id === event.id)
            .map((reminder) => `${reminder.minutes_before} min · ${reminder.channel}`),
        }))
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load calendar. Run the calendar migrations first."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFocusDate(localDate(new Date()));
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const activeVenture =
    ventures.find((venture) => venture.is_default) ||
    ventures.find((venture) => venture.status === "Active") ||
    ventures[0];

  const visibleEvents = useMemo(() => {
    if (!focusDate) return [];
    const focus = new Date(`${focusDate}T00:00:00`);
    let from = focusDate;
    let until = localDate(addDays(focus, 1));
    if (view === "week") {
      const weekStart = startOfWeek(focus);
      from = localDate(weekStart);
      until = localDate(addDays(weekStart, 7));
    } else if (view === "month") {
      from = `${focusDate.slice(0, 7)}-01`;
      const nextMonth = new Date(focus.getFullYear(), focus.getMonth() + 1, 1);
      until = localDate(nextMonth);
    } else if (view === "agenda") {
      until = localDate(addDays(focus, 90));
    }
    return events.filter((event) => {
      const eventDate = zonedIsoToInput(event.start_at, event.timezone).slice(0, 10);
      return (
        eventDate >= from &&
        eventDate < until &&
        (!ventureFilter || event.venture_id === ventureFilter) &&
        (!employeeFilter || event.assigned_employee_id === employeeFilter) &&
        (!typeFilter || event.event_type === typeFilter)
      );
    });
  }, [employeeFilter, events, focusDate, typeFilter, ventureFilter, view]);

  function openAdd(date?: string) {
    const next = emptyForm(defaultTimezone);
    next.venture_id = ventureFilter || activeVenture?.id || "";
    next.assigned_employee_id =
      employees.find(
        (employee) => employee.venture_id === next.venture_id && employee.is_founder
      )?.id || "";
    if (date) {
      next.start_at = `${date}T10:00`;
      next.end_at = `${date}T11:00`;
    }
    setForm(next);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(event: EventRow) {
    setForm({
      venture_id: event.venture_id,
      title: event.title,
      event_type: event.event_type,
      description: event.description || "",
      start_at: zonedIsoToInput(event.start_at, event.timezone),
      end_at: zonedIsoToInput(event.end_at, event.timezone),
      timezone: event.timezone,
      all_day: event.all_day,
      location: event.location || "",
      meeting_link: event.meeting_link || "",
      status: event.status,
      priority: event.priority,
      assigned_employee_id: event.assigned_employee_id || "",
      related_lead_id: event.related_lead_id || "",
      related_client_id: event.related_client_id || "",
      related_project_id: event.related_project_id || "",
      meeting_notes: event.meeting_notes || "",
      outcome: event.outcome || "",
      cancellation_reason: event.cancellation_reason || "",
      recurrence_frequency: event.recurrence_frequency || "",
      recurrence_interval: event.recurrence_interval || 1,
      recurrence_until: event.recurrence_until || "",
      attendee_lines: event.attendees.join("\n"),
      reminder_minutes: event.reminders[0]?.split(" ")[0] || "30",
      reminder_channel:
        (event.reminders[0]?.split(" · ")[1] as ReminderChannel) || "Internal",
      google_sync_status: event.google_sync_status,
    });
    setEditingId(event.id);
    setShowModal(true);
  }

  async function saveEvent(submit: React.FormEvent) {
    submit.preventDefault();
    if (!form.venture_id || !form.title.trim()) return;
    if (form.status === "Cancelled" && !form.cancellation_reason.trim()) {
      setError("A cancellation reason is required.");
      return;
    }
    if (form.status === "Completed" && !form.outcome.trim()) {
      setError("Record the meeting outcome before completing the event.");
      return;
    }
    if (form.recurrence_frequency && !form.recurrence_until) {
      setError("Choose an end date for the recurring series.");
      return;
    }

    const startAt = zonedInputToIso(form.start_at, form.timezone);
    const endAt = zonedInputToIso(form.end_at, form.timezone);
    if (new Date(endAt) <= new Date(startAt)) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const previous = editingId ? events.find((event) => event.id === editingId) : undefined;
      const rescheduled =
        Boolean(previous) && (previous?.start_at !== startAt || previous?.end_at !== endAt);
      const payload = {
        venture_id: form.venture_id,
        title: form.title.trim(),
        event_type: form.event_type,
        description: form.description.trim() || null,
        start_at: startAt,
        end_at: endAt,
        timezone: form.timezone,
        all_day: form.all_day,
        location: form.location.trim() || null,
        meeting_link: form.meeting_link.trim() || null,
        status: form.status,
        priority: form.priority,
        assigned_employee_id: form.assigned_employee_id || null,
        related_lead_id: form.related_lead_id || null,
        related_client_id: form.related_client_id || null,
        related_project_id: form.related_project_id || null,
        meeting_notes: form.meeting_notes.trim() || null,
        outcome: form.outcome.trim() || null,
        cancellation_reason:
          form.status === "Cancelled" ? form.cancellation_reason.trim() : null,
        recurrence_frequency: form.recurrence_frequency || null,
        recurrence_interval: form.recurrence_interval,
        recurrence_until: form.recurrence_frequency ? form.recurrence_until : null,
        google_sync_status: form.google_sync_status,
      };

      let eventId = editingId;
      if (editingId) {
        const updateResult = await supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", editingId)
          .eq("venture_id", form.venture_id);
        if (updateResult.error) throw updateResult.error;
        const [attendeeDelete, reminderDelete] = await Promise.all([
          supabase.from("calendar_event_attendees").delete().eq("event_id", editingId),
          supabase.from("calendar_event_reminders").delete().eq("event_id", editingId),
        ]);
        if (attendeeDelete.error) throw attendeeDelete.error;
        if (reminderDelete.error) throw reminderDelete.error;
      } else {
        const insertResult = await supabase
          .from("calendar_events")
          .insert([payload])
          .select("id")
          .single();
        if (insertResult.error) throw insertResult.error;
        eventId = insertResult.data.id;
      }
      if (!eventId) throw new Error("Event was not saved.");

      const attendees = form.attendee_lines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(.*?)\s*<([^>]+)>$/);
          return {
            event_id: eventId,
            name: match?.[1]?.trim() || line,
            email: match?.[2]?.trim() || null,
          };
        });
      if (attendees.length) {
        const attendeeInsert = await supabase.from("calendar_event_attendees").insert(attendees);
        if (attendeeInsert.error) throw attendeeInsert.error;
      }
      if (form.reminder_minutes !== "") {
        const reminderInsert = await supabase.from("calendar_event_reminders").insert([
          {
            event_id: eventId,
            minutes_before: Number(form.reminder_minutes),
            channel: form.reminder_channel,
          },
        ]);
        if (reminderInsert.error) throw reminderInsert.error;
      }

      const seriesResult = await supabase.rpc("refresh_calendar_event_series", {
        target_event: eventId,
      });
      if (seriesResult.error) throw seriesResult.error;

      const activityResult = await supabase.from("activity_logs").insert([
        {
          venture_id: form.venture_id,
          record_type: "Calendar Event",
          record_id: eventId,
          action: rescheduled ? "event_rescheduled" : editingId ? "event_updated" : "event_created",
          details: {
            title: form.title,
            previous_start_at: rescheduled ? previous?.start_at : null,
            start_at: startAt,
            status: form.status,
            generated_occurrences: seriesResult.data || 0,
          },
        },
      ]);
      if (activityResult.error) throw activityResult.error;

      setShowModal(false);
      setNotice(
        form.recurrence_frequency
          ? `${form.title} saved with ${seriesResult.data || 0} future occurrences.`
          : `${form.title} saved.`
      );
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save event.");
    } finally {
      setSaving(false);
    }
  }

  async function completeEvent(event: EventRow) {
    const outcome = window.prompt("What was the outcome?", event.outcome || "");
    if (!outcome?.trim()) return;
    setError("");
    const updateResult = await supabase
      .from("calendar_events")
      .update({ status: "Completed", outcome: outcome.trim() })
      .eq("id", event.id)
      .eq("venture_id", event.venture_id);
    if (updateResult.error) {
      setError(updateResult.error.message);
      return;
    }
    const [activityResult, todayResult] = await Promise.all([
      supabase.from("activity_logs").insert([
        {
          venture_id: event.venture_id,
          record_type: "Calendar Event",
          record_id: event.id,
          action: "event_completed",
          details: { title: event.title, outcome: outcome.trim() },
          related_lead_id: event.related_lead_id,
          related_client_id: event.related_client_id,
          related_project_id: event.related_project_id,
        },
      ]),
      supabase
        .from("today_action_items")
        .update({ status: "Completed", completed_at: new Date().toISOString() })
        .eq("venture_id", event.venture_id)
        .eq("source_record_type", "Calendar Event")
        .eq("source_record_id", event.id),
    ]);
    if (activityResult.error || todayResult.error) {
      setError(activityResult.error?.message || todayResult.error?.message || "Completion was saved, but its audit update failed.");
    }
    setNotice(`${event.title} completed.`);
    await loadData();
    if ((event.related_client_id || event.related_lead_id) && window.confirm("Create the next customer action now?")) {
      setFollowupEvent({ ...event, status: "Completed", outcome: outcome.trim() });
    }
  }

  async function cancelEvent(event: EventRow) {
    const reason = window.prompt("Cancellation reason");
    if (!reason?.trim()) return;
    const updateResult = await supabase
      .from("calendar_events")
      .update({ status: "Cancelled", cancellation_reason: reason.trim() })
      .eq("id", event.id)
      .eq("venture_id", event.venture_id);
    if (updateResult.error) {
      setError(updateResult.error.message);
      return;
    }
    const activityResult = await supabase.from("activity_logs").insert([
      {
        venture_id: event.venture_id,
        record_type: "Calendar Event",
        record_id: event.id,
        action: "event_cancelled",
        details: { reason: reason.trim() },
      },
    ]);
    if (activityResult.error) setError(activityResult.error.message);
    else setNotice(`${event.title} cancelled.`);
    await loadData();
  }

  function shift(direction: number) {
    const date = new Date(`${focusDate}T00:00:00`);
    if (view === "month") date.setMonth(date.getMonth() + direction);
    else date.setDate(date.getDate() + direction * (view === "day" ? 1 : view === "week" ? 7 : 30));
    setFocusDate(localDate(date));
  }

  const monthDays = useMemo(() => {
    if (!focusDate) return [];
    const focus = new Date(`${focusDate}T00:00:00`);
    const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const gridStart = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [focusDate]);

  const eventCard = (event: EventRow) => {
    const eventTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: event.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(event.start_at));
    return (
      <article
        key={event.id}
        className={`rounded-xl border p-4 ${
          event.status === "Cancelled"
            ? "border-gray-500/20 bg-gray-500/5 opacity-60"
            : event.status === "Completed"
              ? "border-green-500/20 bg-green-500/5"
              : "border-amber-300/15 bg-black/25"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-amber-300/60">{event.event_type}</p>
            <h3 className="truncate font-semibold text-white">{event.title}</h3>
            <p className="mt-1 text-xs text-gray-400">{eventTime} · {event.timezone}</p>
            <p className="mt-1 text-xs text-gray-500">
              {event.employee_name}
              {event.related_name ? ` · ${event.related_name}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.outcome && <p className="mt-2 text-xs text-green-300">Outcome: {event.outcome}</p>}
            {event.recurrence_frequency && (
              <p className="mt-1 text-xs text-sky-300">
                Repeats every {event.recurrence_interval} {event.recurrence_frequency.toLowerCase()}
              </p>
            )}
          </div>
          <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] text-gray-300">{event.status}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => openEdit(event)} className="rounded bg-amber-300/10 px-2 py-1 text-xs text-amber-200">Edit / reschedule</button>
          {["Scheduled", "Confirmed"].includes(event.status) && (
            <button onClick={() => completeEvent(event)} className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-300">Complete</button>
          )}
          {!["Cancelled", "Completed"].includes(event.status) && (
            <button onClick={() => cancelEvent(event)} className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">Cancel</button>
          )}
          {(event.related_client_id || event.related_lead_id) && (
            <button onClick={() => setFollowupEvent(event)} className="rounded bg-sky-500/10 px-2 py-1 text-xs text-sky-300">Create next action</button>
          )}
          {event.meeting_link && (
            <a href={event.meeting_link} target="_blank" rel="noreferrer" className="rounded bg-violet-500/10 px-2 py-1 text-xs text-violet-300">Join meeting</a>
          )}
        </div>
      </article>
    );
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/70">Appointments and schedule</p>
          <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Calendar</h1>
          <p className="mt-1 text-sm text-gray-400">Plan, complete, reschedule, and follow up without duplicate entry.</p>
        </div>
        <button onClick={() => openAdd()} className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-black">+ Add event</button>
      </div>

      {error && <ErrorState message={error} />}
      {notice && <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">{notice}</div>}
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-200">
        Google Calendar remains review-first. This page never creates or changes an external calendar event.
      </div>

      <div className="space-y-3 rounded-2xl border border-amber-300/10 bg-black/20 p-4">
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "agenda"] as ViewMode[]).map((mode) => (
            <button key={mode} onClick={() => setView(mode)} className={`rounded-lg px-3 py-2 text-sm capitalize ${view === mode ? "bg-amber-300 text-black" : "bg-white/8 text-gray-300"}`}>{mode}</button>
          ))}
          <button onClick={() => shift(-1)} className="rounded-lg bg-white/8 px-3 py-2 text-gray-300">←</button>
          <FormInput type="date" value={focusDate} onChange={(event) => setFocusDate(event.target.value)} className="w-auto" />
          <button onClick={() => shift(1)} className="rounded-lg bg-white/8 px-3 py-2 text-gray-300">→</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormSelect value={ventureFilter} onChange={(event) => setVentureFilter(event.target.value)} placeholder="All business units" options={ventures.map((venture) => ({ value: venture.id, label: venture.venture_name }))} />
          <FormSelect value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} placeholder="All employees" options={employees.map((employee) => ({ value: employee.id, label: employee.full_name }))} />
          <FormSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} placeholder="All event types" options={CALENDAR_EVENT_TYPES.map((type) => ({ value: type, label: type }))} />
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-white/10">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="border-b border-white/10 bg-white/5 p-2 text-center text-xs text-gray-500">{day}</div>
          ))}
          {monthDays.map((date) => {
            const dateKey = localDate(date);
            const dayEvents = visibleEvents.filter(
              (event) => zonedIsoToInput(event.start_at, event.timezone).slice(0, 10) === dateKey
            );
            return (
              <button key={dateKey} onClick={() => { setFocusDate(dateKey); setView("day"); }} className="min-h-24 border-b border-r border-white/8 p-2 text-left hover:bg-white/5">
                <span className="text-xs text-gray-400">{date.getDate()}</span>
                {dayEvents.slice(0, 3).map((event) => (
                  <p key={event.id} className="mt-1 truncate rounded bg-amber-300/10 px-1 text-[10px] text-amber-200">{event.title}</p>
                ))}
              </button>
            );
          })}
        </div>
      ) : visibleEvents.length ? (
        <div className="grid gap-3 lg:grid-cols-2">{visibleEvents.map(eventCard)}</div>
      ) : (
        <EmptyState icon="Date" title="No events in this view" description="Add an appointment or move to another date." />
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit calendar event" : "Add calendar event"}>
        <form onSubmit={saveEvent} className="space-y-4">
          <FormSelect label="Business unit" required value={form.venture_id} onChange={(event) => {
            const founder = employees.find((employee) => employee.venture_id === event.target.value && employee.is_founder);
            setForm({ ...form, venture_id: event.target.value, assigned_employee_id: founder?.id || "", related_lead_id: "", related_client_id: "", related_project_id: "" });
          }} options={ventures.map((venture) => ({ value: venture.id, label: venture.venture_name }))} />
          <FormInput label="Title" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Type" required value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value as CalendarEventType })} options={CALENDAR_EVENT_TYPES.map((type) => ({ value: type, label: type }))} />
            <FormSelect label="Status" required value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CalendarEventStatus })} options={CALENDAR_EVENT_STATUSES.map((status) => ({ value: status, label: status }))} />
            <FormInput label="Starts" type="datetime-local" required value={form.start_at} onChange={(event) => setForm({ ...form, start_at: event.target.value })} />
            <FormInput label="Ends" type="datetime-local" required value={form.end_at} onChange={(event) => setForm({ ...form, end_at: event.target.value })} />
            <FormInput label="Time zone" required readOnly value={form.timezone} />
            <FormSelect label="Priority" required value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as CalendarEvent["priority"] })} options={["Low", "Medium", "High", "Urgent"].map((priority) => ({ value: priority, label: priority }))} />
          </div>
          <FormTextarea label="Description" rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Location" maxLength={300} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            <FormInput label="Meeting link" type="url" maxLength={500} value={form.meeting_link} onChange={(event) => setForm({ ...form, meeting_link: event.target.value })} />
          </div>
          <FormSelect label="Responsible employee" value={form.assigned_employee_id} onChange={(event) => setForm({ ...form, assigned_employee_id: event.target.value })} placeholder="Unassigned" options={employees.filter((employee) => employee.venture_id === form.venture_id).map((employee) => ({ value: employee.id, label: employee.full_name }))} />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormSelect label="Related lead" value={form.related_lead_id} onChange={(event) => setForm({ ...form, related_lead_id: event.target.value, related_client_id: "" })} placeholder="None" options={leads.filter((lead) => lead.venture_id === form.venture_id).map((lead) => ({ value: lead.id, label: lead.client_name }))} />
            <FormSelect label="Related client" value={form.related_client_id} onChange={(event) => setForm({ ...form, related_client_id: event.target.value, related_lead_id: "" })} placeholder="None" options={clients.filter((client) => client.venture_id === form.venture_id).map((client) => ({ value: client.id, label: client.client_name }))} />
            <FormSelect label="Related project" value={form.related_project_id} onChange={(event) => setForm({ ...form, related_project_id: event.target.value })} placeholder="None" options={projects.filter((project) => project.venture_id === form.venture_id).map((project) => ({ value: project.id, label: project.project_name }))} />
          </div>
          <FormTextarea label="Attendees" rows={3} value={form.attendee_lines} onChange={(event) => setForm({ ...form, attendee_lines: event.target.value })} placeholder="One per line: Name <email@example.com>" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Reminder minutes before" type="number" min="0" max="43200" value={form.reminder_minutes} onChange={(event) => setForm({ ...form, reminder_minutes: event.target.value })} />
            <FormSelect label="Reminder channel" value={form.reminder_channel} onChange={(event) => setForm({ ...form, reminder_channel: event.target.value as ReminderChannel })} options={["Internal", "Email draft", "WhatsApp draft"].map((channel) => ({ value: channel, label: channel }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormSelect label="Repeats" value={form.recurrence_frequency} onChange={(event) => setForm({ ...form, recurrence_frequency: event.target.value as RecurrenceFrequency | "", recurrence_until: event.target.value ? form.recurrence_until : "" })} placeholder="One time" options={["Daily", "Weekly", "Monthly"].map((frequency) => ({ value: frequency, label: frequency }))} />
            <FormInput label="Repeat interval" type="number" min="1" max="30" disabled={!form.recurrence_frequency} value={form.recurrence_interval} onChange={(event) => setForm({ ...form, recurrence_interval: Number(event.target.value) })} />
            <FormInput label="Repeat until" type="date" required={Boolean(form.recurrence_frequency)} disabled={!form.recurrence_frequency} min={form.start_at.slice(0, 10)} value={form.recurrence_until} onChange={(event) => setForm({ ...form, recurrence_until: event.target.value })} />
          </div>
          <FormTextarea label="Meeting notes" rows={3} maxLength={5000} value={form.meeting_notes} onChange={(event) => setForm({ ...form, meeting_notes: event.target.value })} />
          <FormTextarea label="Outcome" rows={3} required={form.status === "Completed"} maxLength={5000} value={form.outcome} onChange={(event) => setForm({ ...form, outcome: event.target.value })} />
          {form.status === "Cancelled" && <FormTextarea label="Cancellation reason" required rows={2} maxLength={1000} value={form.cancellation_reason} onChange={(event) => setForm({ ...form, cancellation_reason: event.target.value })} />}
          <label className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm text-gray-300">
            <input type="checkbox" checked={form.all_day} onChange={(event) => setForm({ ...form, all_day: event.target.checked })} className="accent-amber-300" />
            All-day event
          </label>
          <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-3 text-xs text-sky-200">
            Google sync status: {form.google_sync_status}. Saving here never creates an external event.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button disabled={saving} className="flex-1 rounded-lg bg-amber-300 py-2.5 font-bold text-black disabled:opacity-50">{saving ? "Saving..." : "Save event"}</button>
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-white/10 py-2.5 text-white">Cancel</button>
          </div>
        </form>
      </Modal>

      {followupEvent && (
        <FollowupModal
          isOpen
          onClose={() => setFollowupEvent(null)}
          onSaved={() => { setFollowupEvent(null); loadData(); }}
          ventureId={followupEvent.venture_id}
          clientId={followupEvent.related_client_id || undefined}
          leadId={followupEvent.related_lead_id || undefined}
          contactName={followupEvent.related_name || followupEvent.title}
        />
      )}
    </div>
  );
}
