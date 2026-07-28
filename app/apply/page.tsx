"use client";

import { useState } from "react";

export default function ApplyPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams(window.location.search);

    const payload = {
      source: "Website Assessment",
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      company: String(formData.get("company") || ""),
      industry: String(formData.get("industry") || ""),
      revenue: String(formData.get("revenue") || ""),
      team: String(formData.get("team") || ""),
      idea: String(formData.get("idea") || ""),
      why: String(formData.get("why") || ""),
      website: String(formData.get("website") || ""),
      landingPage: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmContent: params.get("utm_content") || "",
      utmTerm: params.get("utm_term") || "",
    };

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to send assessment request.");
      }

      form.reset();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to send assessment request.");
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white py-24 px-6">
      <div className="max-w-4xl mx-auto">

        <p className="text-center text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
          Business Assessment
        </p>
        <h1 className="text-5xl font-bold text-center mb-6">
          Request A Free Assessment From{" "}
          <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
            Groenics
          </span>
        </h1>

        <p className="text-center text-gray-400 mb-12">
          Tell us where the business is losing time, revenue, visibility, or customer trust. We will help identify the root problems and the right AI, automation, or software solution.
        </p>

        <form
          onSubmit={handleSubmit}
          className="brand-panel border border-amber-300/15 rounded-3xl p-8 md:p-10 space-y-6"
        >
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px overflow-hidden"
          />
          {status === "success" && (
            <div className="rounded-xl border border-green-400/25 bg-green-400/10 px-4 py-3 text-sm text-green-200">
              Assessment request saved in the portal. I will get back to you soon.
            </div>
          )}
          {status === "error" && (
            <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            maxLength={120}
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            maxLength={254}
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone / WhatsApp Number"
            maxLength={30}
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="company"
            placeholder="Company / Business Name"
            maxLength={200}
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="industry"
            placeholder="Industry"
            maxLength={200}
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="revenue"
            placeholder="Current Monthly Revenue"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="team"
            placeholder="Team Size"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <textarea
            rows={4}
            name="idea"
            maxLength={5000}
            placeholder="Describe the business problem you want to solve"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <textarea
            rows={5}
            name="why"
            maxLength={5000}
            placeholder="What is the current impact? For example lost revenue, manual work, slow follow-ups, poor reporting, or customer issues."
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <button
            type="submit"
            disabled={status === "submitting"}
            className="px-8 py-4 bg-amber-300 hover:bg-amber-200 text-black font-semibold rounded-full transition"
          >
            {status === "submitting" ? "Saving Request..." : "Request Assessment"}
          </button>
        </form>

      </div>
    </main>
  );
}

