"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BUSINESS_TIMEZONES,
  BusinessSettings,
  CURRENCY_CODES,
  CreateBusinessSettingsInput,
  Venture,
} from "@/lib/types";
import { FormInput, FormSelect, FormTextarea } from "@/components/Portal/FormInputs";
import { LoadingState } from "@/components/Portal/States";

const defaultSettings: CreateBusinessSettingsInput = {
  business_name: "Groenics",
  legal_name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  tax_id: "",
  bank_details: "",
  upi_id: "",
  invoice_prefix: "INV",
  proposal_prefix: "PROP",
  default_payment_terms: "Payment due within 15 days.",
  currency_code: "INR",
  timezone: "Asia/Kolkata",
  monthly_revenue_target: 0,
  no_contact_warning_days: 7,
  lead_stuck_warning_days: 14,
  client_update_warning_days: 14,
  score_weight_problem_severity: 15,
  score_weight_urgency: 15,
  score_weight_ability_to_pay: 15,
  score_weight_decision_maker: 15,
  score_weight_estimated_value: 10,
  score_weight_engagement: 10,
  score_weight_timeline: 10,
  score_weight_founder_fit: 10,
};

const scoringFields = [
  ["score_weight_problem_severity", "Problem severity"],
  ["score_weight_urgency", "Urgency"],
  ["score_weight_ability_to_pay", "Ability to pay"],
  ["score_weight_decision_maker", "Decision-maker access"],
  ["score_weight_estimated_value", "Estimated value"],
  ["score_weight_engagement", "Engagement"],
  ["score_weight_timeline", "Timeline"],
  ["score_weight_founder_fit", "Founder/company fit"],
] as const;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingDefault, setChangingDefault] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [ventureId, setVentureId] = useState("");
  const [selectedDefaultId, setSelectedDefaultId] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateBusinessSettingsInput>(defaultSettings);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const ventureResult = await supabase
        .from("ventures")
        .select("*")
        .eq("status", "Active")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("venture_name");
      if (ventureResult.error) throw ventureResult.error;

      const rows = (ventureResult.data || []) as Venture[];
      const active = rows.find((venture) => venture.is_default) || rows[0];
      setVentures(rows);
      if (!active) {
        setError("No active business found.");
        return;
      }

      setVentureId(active.id);
      setSelectedDefaultId(active.id);
      const settingsResult = await supabase
        .from("business_settings")
        .select("*")
        .eq("venture_id", active.id)
        .maybeSingle();
      if (settingsResult.error) throw settingsResult.error;

      if (!settingsResult.data) {
        setSettingsId(null);
        setFormData({ ...defaultSettings, business_name: active.venture_name });
        return;
      }

      const settings = settingsResult.data as BusinessSettings;
      setSettingsId(settings.id);
      setFormData({
        business_name: settings.business_name || active.venture_name,
        legal_name: settings.legal_name || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        website: settings.website || "",
        tax_id: settings.tax_id || "",
        bank_details: settings.bank_details || "",
        upi_id: settings.upi_id || "",
        invoice_prefix: settings.invoice_prefix || "INV",
        proposal_prefix: settings.proposal_prefix || "PROP",
        default_payment_terms: settings.default_payment_terms || "",
        currency_code: settings.currency_code || "INR",
        timezone: settings.timezone || "Asia/Kolkata",
        monthly_revenue_target: settings.monthly_revenue_target ?? 0,
        no_contact_warning_days: settings.no_contact_warning_days || 7,
        lead_stuck_warning_days: settings.lead_stuck_warning_days || 14,
        client_update_warning_days: settings.client_update_warning_days || 14,
        score_weight_problem_severity: settings.score_weight_problem_severity ?? 15,
        score_weight_urgency: settings.score_weight_urgency ?? 15,
        score_weight_ability_to_pay: settings.score_weight_ability_to_pay ?? 15,
        score_weight_decision_maker: settings.score_weight_decision_maker ?? 15,
        score_weight_estimated_value: settings.score_weight_estimated_value ?? 10,
        score_weight_engagement: settings.score_weight_engagement ?? 10,
        score_weight_timeline: settings.score_weight_timeline ?? 10,
        score_weight_founder_fit: settings.score_weight_founder_fit ?? 10,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadSettings, 0);
    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  async function setDefaultBusiness() {
    if (!selectedDefaultId || selectedDefaultId === ventureId) return;
    setChangingDefault(true);
    setError("");
    setSuccess("");
    const { error: defaultError } = await supabase.rpc("set_default_venture", {
      target_venture: selectedDefaultId,
    });
    setChangingDefault(false);
    if (defaultError) {
      setError(defaultError.message);
      return;
    }
    setSuccess("Default business changed. Its settings are now loaded.");
    await loadSettings();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!ventureId) throw new Error("No default business found.");
      const invoicePrefix = formData.invoice_prefix?.trim().toUpperCase() || "";
      const proposalPrefix = formData.proposal_prefix?.trim().toUpperCase() || "";
      if (!/^[A-Z0-9-]{1,12}$/.test(invoicePrefix) || !/^[A-Z0-9-]{1,12}$/.test(proposalPrefix)) {
        throw new Error("Prefixes may contain only letters, numbers, and hyphens (maximum 12 characters).");
      }

      const payload = {
        ...formData,
        business_name: formData.business_name.trim(),
        invoice_prefix: invoicePrefix,
        proposal_prefix: proposalPrefix,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error: updateError } = await supabase
          .from("business_settings")
          .update(payload)
          .eq("id", settingsId)
          .eq("venture_id", ventureId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("business_settings")
          .insert([{ ...payload, venture_id: ventureId }])
          .select("id")
          .single();
        if (insertError) throw insertError;
        setSettingsId(data.id);
      }

      const scoreResult = await supabase.rpc("recalculate_venture_lead_scores", {
        target_venture: ventureId,
      });
      if (scoreResult.error) throw scoreResult.error;
      setSuccess("Business settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Business Settings</h1>
        <p className="text-gray-400">Company and payment defaults used across proposals, invoices, receipts, and scheduling.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-green-500/35 bg-green-500/10 p-4 text-sm text-green-200">{success}</div>}

      <section className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-amber-200">Default business context</h2>
          <p className="mt-1 text-xs text-gray-500">Daily operations use this business by default. Changing it loads that business&apos;s own settings.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <FormSelect
            label="Default business"
            required
            value={selectedDefaultId}
            onChange={(event) => setSelectedDefaultId(event.target.value)}
            options={ventures.map((venture) => ({ value: venture.id, label: `${venture.venture_name} · ${venture.venture_kind}` }))}
          />
          <button
            type="button"
            onClick={setDefaultBusiness}
            disabled={changingDefault || selectedDefaultId === ventureId}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {changingDefault ? "Changing..." : "Set as default"}
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-amber-300/10 bg-black/20 p-5 sm:p-6">
        <section className="space-y-4">
          <div><h2 className="font-semibold text-white">Business identity</h2><p className="mt-1 text-xs text-gray-500">Displayed on commercial documents and customer communication.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Business name *" required maxLength={120} value={formData.business_name} onChange={(event) => setFormData({ ...formData, business_name: event.target.value })} />
            <FormInput label="Legal name" maxLength={160} value={formData.legal_name || ""} onChange={(event) => setFormData({ ...formData, legal_name: event.target.value })} />
            <FormInput label="Email" type="email" maxLength={254} value={formData.email || ""} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
            <FormInput label="Phone" maxLength={30} value={formData.phone || ""} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
            <FormInput label="Website" type="url" maxLength={300} value={formData.website || ""} onChange={(event) => setFormData({ ...formData, website: event.target.value })} />
            <FormInput label="GST / Tax ID" maxLength={40} value={formData.tax_id || ""} onChange={(event) => setFormData({ ...formData, tax_id: event.target.value.toUpperCase() })} />
          </div>
          <FormTextarea label="Business address" rows={3} maxLength={1000} value={formData.address || ""} onChange={(event) => setFormData({ ...formData, address: event.target.value })} />
        </section>

        <section className="space-y-4 border-t border-white/8 pt-6">
          <div><h2 className="font-semibold text-white">Commercial defaults</h2><p className="mt-1 text-xs text-gray-500">Applied when preparing new proposals and invoices; drafts still require review.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Invoice prefix" required maxLength={12} value={formData.invoice_prefix || ""} onChange={(event) => setFormData({ ...formData, invoice_prefix: event.target.value.toUpperCase() })} />
            <FormInput label="Proposal prefix" required maxLength={12} value={formData.proposal_prefix || ""} onChange={(event) => setFormData({ ...formData, proposal_prefix: event.target.value.toUpperCase() })} />
            <FormSelect label="Currency" required value={formData.currency_code} onChange={(event) => setFormData({ ...formData, currency_code: event.target.value as NonNullable<CreateBusinessSettingsInput["currency_code"]> })} options={CURRENCY_CODES.map((currency) => ({ value: currency, label: currency }))} />
            <FormSelect label="Time zone" required value={formData.timezone} onChange={(event) => setFormData({ ...formData, timezone: event.target.value as NonNullable<CreateBusinessSettingsInput["timezone"]> })} options={BUSINESS_TIMEZONES.map((timezone) => ({ value: timezone, label: timezone === "Asia/Kolkata" ? "India · Asia/Kolkata" : timezone }))} />
            <FormInput label="UPI ID" maxLength={120} value={formData.upi_id || ""} onChange={(event) => setFormData({ ...formData, upi_id: event.target.value })} />
          </div>
          <FormTextarea label="Bank details" rows={4} maxLength={2000} value={formData.bank_details || ""} onChange={(event) => setFormData({ ...formData, bank_details: event.target.value })} placeholder="Beneficiary, bank, account number, and IFSC" />
          <FormTextarea label="Default payment terms" rows={3} maxLength={2000} value={formData.default_payment_terms || ""} onChange={(event) => setFormData({ ...formData, default_payment_terms: event.target.value })} />
        </section>

        <details className="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4">
          <summary className="cursor-pointer font-semibold text-sky-200">Advanced operational thresholds</summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-500">These values control management warnings and targets. The provided defaults are safe for a founder-led operation.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormInput label="Monthly collection target" type="number" min="0" step="1000" value={formData.monthly_revenue_target ?? 0} onChange={(event) => setFormData({ ...formData, monthly_revenue_target: Number(event.target.value) })} />
              <FormInput label="No contact after days" type="number" min="1" max="365" required value={formData.no_contact_warning_days || 7} onChange={(event) => setFormData({ ...formData, no_contact_warning_days: Number(event.target.value) })} />
              <FormInput label="Lead stuck after days" type="number" min="1" max="365" required value={formData.lead_stuck_warning_days || 14} onChange={(event) => setFormData({ ...formData, lead_stuck_warning_days: Number(event.target.value) })} />
              <FormInput label="Client update after days" type="number" min="1" max="365" required value={formData.client_update_warning_days || 14} onChange={(event) => setFormData({ ...formData, client_update_warning_days: Number(event.target.value) })} />
            </div>
          </div>
        </details>

        <details className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
          <summary className="cursor-pointer font-semibold text-violet-200">Advanced lead-scoring weights</summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-500">Temperature labels should guide daily decisions. Numeric weights are optional diagnostics and are normalized automatically.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {scoringFields.map(([key, label]) => (
                <FormInput key={key} label={label} type="number" min="0" max="100" required value={formData[key] ?? 0} onChange={(event) => setFormData({ ...formData, [key]: Number(event.target.value) })} />
              ))}
            </div>
          </div>
        </details>

        <details className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <summary className="cursor-pointer font-semibold text-gray-300">Technical integrations</summary>
          <div className="mt-4 text-sm text-gray-500">
            Calendar synchronization metadata and external provider identifiers are managed by the Calendar integration flow. They are intentionally read-only here to prevent accidental sync damage.
          </div>
        </details>

        <button type="submit" disabled={saving} className="w-full rounded-xl bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-200 disabled:opacity-50 sm:w-auto">
          {saving ? "Saving..." : "Save business settings"}
        </button>
      </form>
    </div>
  );
}
