"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FOLLOWUP_TYPES, FOLLOWUP_TYPE_ICONS, FollowupType, Followup,
} from "@/lib/types";
import Modal from "./Modal";
import { FormInput, FormSelect, FormTextarea } from "./FormInputs";

interface FollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  ventureId: string;
  clientId?: string;
  leadId?: string;
  contactName: string;
}

export default function FollowupModal({
  isOpen, onClose, onSaved,
  ventureId, clientId, leadId, contactName,
}: FollowupModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    type: "Call" as FollowupType,
    notes: "",
    follow_up_date: today,
    next_follow_up: "",
    status: "Done" as Followup["status"],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ventureId) { setError("No active venture."); return; }
    setError("");
    setSubmitting(true);
    try {
      const { error: err } = await supabase.from("followups").insert([{
        venture_id: ventureId,
        client_id: clientId || null,
        lead_id: leadId || null,
        type: formData.type,
        notes: formData.notes || null,
        follow_up_date: formData.follow_up_date,
        next_follow_up: formData.next_follow_up || null,
        status: formData.status,
      }]);
      if (err) throw err;

      // Update lead's next_follow_up if provided
      if (formData.next_follow_up && leadId) {
        await supabase.from("leads")
          .update({ next_follow_up: formData.next_follow_up })
          .eq("id", leadId);
      }

      // Reset form
      setFormData({ type: "Call", notes: "", follow_up_date: today, next_follow_up: "", status: "Done" });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Follow-up — ${contactName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Type *"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as FollowupType })}
            options={FOLLOWUP_TYPES.map(t => ({ value: t, label: `${FOLLOWUP_TYPE_ICONS[t]} ${t}` }))}
            required
          />
          <FormSelect
            label="Status *"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as Followup["status"] })}
            options={[
              { value: "Done", label: "✅ Done" },
              { value: "Pending", label: "⏳ Pending" },
            ]}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Date *"
            type="date"
            value={formData.follow_up_date}
            onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })}
            required
          />
          <FormInput
            label="Next Follow-up"
            type="date"
            value={formData.next_follow_up}
            onChange={e => setFormData({ ...formData, next_follow_up: e.target.value })}
          />
        </div>

        <FormTextarea
          label="Notes"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="What was discussed? Any key points..."
          rows={4}
        />

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={submitting}
            className="flex-1 bg-amber-300 hover:bg-amber-200 disabled:bg-amber-300/40 text-black font-bold py-2.5 rounded-xl transition text-sm">
            {submitting ? "Saving..." : "Log Follow-up"}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-white/8 hover:bg-white/12 text-white font-medium py-2.5 rounded-xl transition text-sm">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
