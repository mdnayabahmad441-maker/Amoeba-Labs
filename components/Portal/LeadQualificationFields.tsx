"use client";

import {
  CreateLeadInput,
  LEAD_TEMPERATURES,
  PIPELINE_STAGES,
  ScoreFactor,
} from "@/lib/types";
import { FormInput, FormSelect, FormTextarea } from "./FormInputs";

const factorOptions = [0, 1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} / 5`,
}));

interface Props {
  value: CreateLeadInput;
  onChange: (value: CreateLeadInput) => void;
}

function guidance(stage: CreateLeadInput["pipeline_stage"]) {
  if (stage === "New") return "Start with contact information. Deeper qualification can wait until the lead engages.";
  if (stage === "Contacted" || stage === "Meeting/Demo") return "Clarify the main problem, urgency, and decision-maker access.";
  if (stage === "Qualified") return "Confirm budget, timeline, expected value, and fit before preparing a proposal.";
  if (stage === "Proposal" || stage === "Negotiation") return "Verify final requirements, buying authority, timeline, and commercial information.";
  if (stage === "Won") return "The opportunity is won. Client conversion will be handled by the dedicated conversion phase.";
  if (stage === "Lost") return "Record the specific loss reason so future sales decisions improve.";
  return "Capture only information verified through real conversations.";
}

export default function LeadQualificationFields({ value, onChange }: Props) {
  const factor = (field: keyof CreateLeadInput, input: string) =>
    onChange({ ...value, [field]: input === "" ? "" : Number(input) as ScoreFactor });

  return (
    <fieldset className="space-y-4 rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
      <div>
        <legend className="font-semibold text-sky-200">Opportunity</legend>
        <p className="mt-1 text-xs text-gray-500">Qualify progressively. Advanced fields are optional.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Pipeline stage"
          required
          value={value.pipeline_stage || "New"}
          onChange={(event) => onChange({ ...value, pipeline_stage: event.target.value as CreateLeadInput["pipeline_stage"] })}
          options={PIPELINE_STAGES.map((stage) => ({ value: stage, label: stage }))}
        />
        <FormSelect
          label="Lead temperature"
          required
          value={value.lead_temperature || "Cold"}
          onChange={(event) => onChange({ ...value, lead_temperature: event.target.value as CreateLeadInput["lead_temperature"] })}
          options={LEAD_TEMPERATURES.map((temperature) => ({ value: temperature, label: temperature }))}
        />
        <FormInput
          label="Business type"
          value={value.business_type || ""}
          onChange={(event) => onChange({ ...value, business_type: event.target.value })}
          placeholder="School, clinic, retailer..."
        />
        <FormInput
          label="Location"
          value={value.location || ""}
          onChange={(event) => onChange({ ...value, location: event.target.value })}
        />
      </div>

      <FormTextarea
        label="Main business problem"
        rows={3}
        value={value.main_business_problem || ""}
        onChange={(event) => onChange({ ...value, main_business_problem: event.target.value })}
        placeholder="What operational or commercial problem needs solving?"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormSelect
          label="Urgency"
          value={String(value.urgency ?? "")}
          onChange={(event) => factor("urgency", event.target.value)}
          placeholder="Not assessed"
          options={factorOptions}
        />
        <FormInput
          label="Budget range"
          value={value.budget_range || ""}
          onChange={(event) => onChange({ ...value, budget_range: event.target.value })}
          placeholder="e.g. ₹50k–₹1 lakh"
        />
        <FormInput
          label="Expected project value"
          type="number"
          min="0"
          step="0.01"
          value={value.expected_project_value ?? ""}
          onChange={(event) => onChange({ ...value, expected_project_value: event.target.value === "" ? "" : Number(event.target.value) })}
        />
      </div>

      <p className="rounded-xl border border-sky-500/10 bg-sky-500/5 p-3 text-xs leading-5 text-sky-100/70">
        {guidance(value.pipeline_stage)}
      </p>

      {(value.lead_temperature === "Unqualified") && (
        <FormTextarea
          label="Disqualification reason"
          required
          rows={2}
          value={value.disqualification_reason || ""}
          onChange={(event) => onChange({ ...value, disqualification_reason: event.target.value })}
        />
      )}
      {(value.pipeline_stage === "Lost") && (
        <FormTextarea
          label="Lost reason"
          required
          rows={2}
          value={value.lost_reason || ""}
          onChange={(event) => onChange({ ...value, lost_reason: event.target.value })}
        />
      )}

      <details className="group rounded-xl border border-sky-500/15 bg-black/15">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          <span className="flex items-center justify-between gap-3">
            Advanced qualification
            <span className="text-xs text-sky-200/50 group-open:rotate-180" aria-hidden="true">▼</span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-sky-500/15 p-4">
          <p className="text-xs leading-5 text-gray-500">
            Complete these fields only as discovery progresses. Empty fields reduce score confidence but never block saving.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Industry" value={value.industry || ""} onChange={(event) => onChange({ ...value, industry: event.target.value })} />
            <FormInput label="Company size" value={value.company_size || ""} onChange={(event) => onChange({ ...value, company_size: event.target.value })} />
            <FormInput label="Number of branches" type="number" min="0" value={value.number_of_branches ?? ""} onChange={(event) => onChange({ ...value, number_of_branches: event.target.value === "" ? "" : Number(event.target.value) })} />
            <FormInput label="Buying timeline" value={value.buying_timeline || ""} onChange={(event) => onChange({ ...value, buying_timeline: event.target.value })} />
            <FormInput label="Current workaround" value={value.current_workaround || ""} onChange={(event) => onChange({ ...value, current_workaround: event.target.value })} />
            <FormInput label="Existing software" value={value.existing_software || ""} onChange={(event) => onChange({ ...value, existing_software: event.target.value })} />
            <FormInput label="Decision-maker name" value={value.decision_maker_name || ""} onChange={(event) => onChange({ ...value, decision_maker_name: event.target.value })} />
            <FormInput label="Competitor considered" value={value.competitor_considered || ""} onChange={(event) => onChange({ ...value, competitor_considered: event.target.value })} />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={Boolean(value.decision_maker_identified)}
              onChange={(event) => onChange({ ...value, decision_maker_identified: event.target.checked })}
              className="h-4 w-4 accent-amber-300"
            />
            Decision-maker identified
          </label>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormSelect label="Problem severity" value={String(value.problem_severity ?? "")} onChange={(event) => factor("problem_severity", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormSelect label="Authority level" value={String(value.authority_level ?? "")} onChange={(event) => factor("authority_level", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormSelect label="Need level" value={String(value.need_level ?? "")} onChange={(event) => factor("need_level", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormSelect label="Ability to pay" value={String(value.ability_to_pay ?? "")} onChange={(event) => factor("ability_to_pay", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormSelect label="Engagement" value={String(value.engagement_score ?? "")} onChange={(event) => factor("engagement_score", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormSelect label="Timeline fit" value={String(value.timeline_score ?? "")} onChange={(event) => factor("timeline_score", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormSelect label="Founder/company fit" value={String(value.founder_company_fit ?? "")} onChange={(event) => factor("founder_company_fit", event.target.value)} placeholder="Not scored" options={factorOptions} />
            <FormInput label="Closing probability (%)" type="number" min="0" max="100" value={value.probability_of_closing ?? ""} onChange={(event) => onChange({ ...value, probability_of_closing: event.target.value === "" ? "" : Number(event.target.value) })} />
          </div>

          <FormTextarea
            label="Qualification notes"
            rows={3}
            value={value.qualification_notes || ""}
            onChange={(event) => onChange({ ...value, qualification_notes: event.target.value })}
          />
        </div>
      </details>
    </fieldset>
  );
}
