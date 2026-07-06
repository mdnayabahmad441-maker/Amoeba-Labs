"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BusinessSettings, CreateBusinessSettingsInput } from "@/lib/types";
import { FormInput, FormTextarea } from "@/components/Portal/FormInputs";
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
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ventureId, setVentureId] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateBusinessSettingsInput>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const { data: ventures } = await supabase
        .from("ventures")
        .select("id")
        .eq("status", "Active")
        .limit(1);

      if (!ventures || ventures.length === 0) {
        setError("No active venture found.");
        return;
      }

      const activeVentureId = ventures[0].id;
      setVentureId(activeVentureId);

      const { data, error: settingsError } = await supabase
        .from("business_settings")
        .select("*")
        .eq("venture_id", activeVentureId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (data) {
        const settings = data as BusinessSettings;
        setSettingsId(settings.id);
        setFormData({
          business_name: settings.business_name || "Groenics",
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
        });
      }
    } catch (err: any) {
      setError(err.message || "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!ventureId) throw new Error("No active venture found.");

      const payload = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error: updateError } = await supabase
          .from("business_settings")
          .update(payload)
          .eq("id", settingsId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("business_settings")
          .insert([{ ...payload, venture_id: ventureId }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettingsId(data.id);
      }

      setSuccess("Business settings saved.");
    } catch (err: any) {
      setError(err.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Business Settings</h1>
        <p className="text-gray-400">Control company details used across proposals, invoices, and receipts.</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-200">{error}</div>}
      {success && <div className="rounded-lg border border-green-500/40 bg-green-500/15 p-4 text-green-200">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-amber-300/10 bg-black/20 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Business Name *"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            required
          />
          <FormInput
            label="Legal Name"
            value={formData.legal_name || ""}
            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
          />
          <FormInput
            label="Email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <FormInput
            label="Phone"
            value={formData.phone || ""}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <FormInput
            label="Website"
            value={formData.website || ""}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
          <FormInput
            label="GST / Tax ID"
            value={formData.tax_id || ""}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
          />
          <FormInput
            label="Invoice Prefix"
            value={formData.invoice_prefix || ""}
            onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
          />
          <FormInput
            label="Proposal Prefix"
            value={formData.proposal_prefix || ""}
            onChange={(e) => setFormData({ ...formData, proposal_prefix: e.target.value.toUpperCase() })}
          />
        </div>

        <FormTextarea
          label="Address"
          rows={3}
          value={formData.address || ""}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
        <FormTextarea
          label="Bank Details"
          rows={4}
          value={formData.bank_details || ""}
          onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
          placeholder="Bank name, account number, IFSC, beneficiary name"
        />
        <FormInput
          label="UPI ID"
          value={formData.upi_id || ""}
          onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
        />
        <FormTextarea
          label="Default Payment Terms"
          rows={3}
          value={formData.default_payment_terms || ""}
          onChange={(e) => setFormData({ ...formData, default_payment_terms: e.target.value })}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:bg-amber-300/50 sm:w-auto"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
