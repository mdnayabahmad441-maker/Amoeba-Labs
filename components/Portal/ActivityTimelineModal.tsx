"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ActivityLog } from "@/lib/types";
import Modal from "./Modal";
import { EmptyState, ErrorState, LoadingState } from "./States";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ventureId: string;
  recordType: "Lead" | "Client" | "Project";
  recordId: string;
  recordName: string;
}

export default function ActivityTimelineModal({ isOpen, onClose, ventureId, recordType, recordId, recordName }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const relationColumn = recordType === "Lead" ? "related_lead_id" : recordType === "Client" ? "related_client_id" : "related_project_id";
      supabase.from("activity_logs").select("*").eq("venture_id", ventureId).or(`and(record_type.eq.${recordType},record_id.eq.${recordId}),${relationColumn}.eq.${recordId}`).order("created_at", { ascending: false }).then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(loadError.message);
        else setLogs((data || []) as ActivityLog[]);
        setLoading(false);
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isOpen, recordId, recordType, ventureId]);

  return <Modal isOpen={isOpen} onClose={onClose} title={`Activity · ${recordName}`}>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : logs.length === 0 ? <EmptyState icon="🕘" title="No activity yet" description="New changes and follow-ups will appear here." /> : <div className="space-y-3">{logs.map((log) => <article key={log.id} className="border-l-2 border-amber-300/30 pl-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold capitalize text-white">{log.action.replaceAll("_", " ")}</p><time className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString("en-IN")}</time></div><pre className="mt-1 whitespace-pre-wrap break-words font-sans text-xs text-gray-400">{Object.entries(log.details || {}).filter(([, value]) => value !== null && value !== "").map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`).join("\n") || "Activity recorded"}</pre></article>)}</div>}
  </Modal>;
}
