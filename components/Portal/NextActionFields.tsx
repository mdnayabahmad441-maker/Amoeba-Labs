"use client";

import {
  COMMUNICATION_CHANNELS,
  CommunicationChannel,
  Employee,
  FOLLOW_UP_PRIORITIES,
  FollowUpPriority,
  NEXT_ACTION_TYPES,
  NextActionType,
} from "@/lib/types";
import { FormInput, FormSelect, FormTextarea } from "./FormInputs";

export interface NextActionFormValue {
  next_action_type?: NextActionType | "";
  next_action_at?: string;
  communication_channel?: CommunicationChannel | "";
  responsible_employee_id?: string;
  expected_outcome?: string;
  last_contact_at?: string;
  follow_up_priority?: FollowUpPriority;
  follow_up_notes?: string;
}

interface Props<T extends NextActionFormValue> {
  value: T;
  employees: Employee[];
  onChange: (value: T) => void;
}

export default function NextActionFields<T extends NextActionFormValue>({
  value,
  employees,
  onChange,
}: Props<T>) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4">
      <div>
        <legend className="font-semibold text-amber-200">Next action</legend>
        <p className="mt-1 text-xs text-gray-500">The next customer-facing step, its owner, and due date.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Next action"
          value={value.next_action_type || ""}
          onChange={(event) => onChange({ ...value, next_action_type: event.target.value as NextActionType | "" })}
          placeholder="No next action"
          options={NEXT_ACTION_TYPES.map((type) => ({ value: type, label: type }))}
        />
        <FormInput
          label="Next-action date"
          type="datetime-local"
          value={value.next_action_at || ""}
          onChange={(event) => onChange({ ...value, next_action_at: event.target.value })}
        />
        <FormSelect
          label="Responsible person"
          value={value.responsible_employee_id || ""}
          onChange={(event) => onChange({ ...value, responsible_employee_id: event.target.value })}
          placeholder="Unassigned"
          options={employees.map((employee) => ({ value: employee.id, label: employee.full_name }))}
        />
        <FormSelect
          label="Priority"
          required
          value={value.follow_up_priority || "Medium"}
          onChange={(event) => onChange({ ...value, follow_up_priority: event.target.value as FollowUpPriority })}
          options={FOLLOW_UP_PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
        />
      </div>

      <details className="group rounded-xl border border-amber-300/10 bg-black/15">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <span className="flex items-center justify-between gap-3">
            Action context
            <span className="text-xs text-gray-500 group-open:rotate-180" aria-hidden="true">▼</span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-amber-300/10 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Communication channel"
              value={value.communication_channel || ""}
              onChange={(event) => onChange({ ...value, communication_channel: event.target.value as CommunicationChannel | "" })}
              placeholder="Select channel"
              options={COMMUNICATION_CHANNELS.map((channel) => ({ value: channel, label: channel }))}
            />
            <FormInput
              label="Last contact"
              type="datetime-local"
              value={value.last_contact_at || ""}
              onChange={(event) => onChange({ ...value, last_contact_at: event.target.value })}
            />
          </div>
          <FormInput
            label="Expected outcome"
            maxLength={240}
            value={value.expected_outcome || ""}
            onChange={(event) => onChange({ ...value, expected_outcome: event.target.value })}
            placeholder="What should this action achieve?"
          />
          <FormTextarea
            label="Follow-up context"
            rows={3}
            value={value.follow_up_notes || ""}
            onChange={(event) => onChange({ ...value, follow_up_notes: event.target.value })}
            placeholder="Context needed when completing the action"
          />
        </div>
      </details>
    </fieldset>
  );
}
