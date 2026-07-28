import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

type EnquiryBody = {
  source?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  revenue?: string;
  team?: string;
  message?: string;
  idea?: string;
  why?: string;
  website?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

const FORMSPREE_ENDPOINTS: Record<string, string> = {
  "Website Contact": "https://formspree.io/f/xeewqrzw",
  "Website Assessment": "https://formspree.io/f/xbdejzzo",
};

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizePhone(value?: string) {
  const digits = value?.replace(/\D/g, "") || "";
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

function indiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function buildNotes(body: EnquiryBody) {
  const lines = [
    clean(body.message) && `Message: ${clean(body.message)}`,
    clean(body.idea) && `Problem: ${clean(body.idea)}`,
    clean(body.why) && `Impact: ${clean(body.why)}`,
    clean(body.industry) && `Industry: ${clean(body.industry)}`,
    clean(body.revenue) && `Monthly revenue: ${clean(body.revenue)}`,
    clean(body.team) && `Team size: ${clean(body.team)}`,
  ].filter(Boolean);

  return lines.join("\n\n") || null;
}

async function forwardToFormspree(body: EnquiryBody) {
  const endpoint = FORMSPREE_ENDPOINTS[body.source || ""];
  if (!endpoint) {
    return;
  }

  await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`enquiry:${getRequestIp(request)}`, 8, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many enquiries. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { error: "Enquiry capture is not configured securely." },
      { status: 500 }
    );
  }

  let body: EnquiryBody;

  try {
    body = (await request.json()) as EnquiryBody;
  } catch {
    return Response.json({ error: "Invalid enquiry payload." }, { status: 400 });
  }

  // Honeypot fields are hidden from people. Return a neutral success response so
  // automated submitters cannot tune themselves against the filter.
  if (clean(body.website)) {
    return Response.json({ ok: true, duplicate: false, emailForwarded: false });
  }

  const name = clean(body.name);
  const email = clean(body.email)?.toLowerCase();
  const phone = normalizePhone(body.phone);
  const source = clean(body.source) || "Website";

  if (!name || !email || !["Website", "Website Contact", "Website Assessment"].includes(source)) {
    return Response.json({ error: "Name and email are required." }, { status: 400 });
  }

  if (name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid name and email address." }, { status: 400 });
  }

  const identityRateLimit = checkRateLimit(`enquiry-email:${email}`, 3, 60 * 60 * 1000);
  if (!identityRateLimit.allowed) {
    return Response.json(
      { error: "Too many enquiries for this email. Please try again later." },
      { status: 429, headers: { "Retry-After": String(identityRateLimit.retryAfterSeconds) } }
    );
  }

  if ([body.phone, body.company, body.industry].some((value) => value && value.length > 200)) {
    return Response.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  if ([body.message, body.idea, body.why].some((value) => value && value.length > 5000)) {
    return Response.json({ error: "The enquiry message is too long." }, { status: 400 });
  }

  const combinedMessage = [body.message, body.idea, body.why].filter(Boolean).join(" ");
  const linkCount = (combinedMessage.match(/https?:\/\//gi) || []).length;
  if (linkCount > 3 || /(casino|crypto giveaway|guest post|seo backlinks)/i.test(combinedMessage)) {
    return Response.json({ ok: true, duplicate: false, emailForwarded: false });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: venture, error: ventureError } = await supabase
    .from("ventures")
    .select("id")
    .eq("status", "Active")
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ventureError || !venture) {
    return Response.json(
      { error: ventureError?.message || "No active venture found for this enquiry." },
      { status: 500 }
    );
  }

  const { data: founderEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("venture_id", venture.id)
    .eq("is_founder", true)
    .eq("status", "Active")
    .is("archived_at", null)
    .maybeSingle();

  const emailLookup = await supabase
    .from("leads")
    .select("id, enquiry_count, notes, responsible_employee_id")
    .eq("venture_id", venture.id)
    .is("archived_at", null)
    .eq("normalized_email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (emailLookup.error) {
    return Response.json({ error: "Unable to check this enquiry safely." }, { status: 500 });
  }

  let existingLead = emailLookup.data;
  if (!existingLead && phone) {
    const phoneLookup = await supabase
      .from("leads")
      .select("id, enquiry_count, notes, responsible_employee_id")
      .eq("venture_id", venture.id)
      .is("archived_at", null)
      .eq("normalized_phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (phoneLookup.error) {
      return Response.json({ error: "Unable to check this enquiry safely." }, { status: 500 });
    }
    existingLead = phoneLookup.data;
  }

  const nextActionDate = addCalendarDays(indiaDateString(), 1);
  const nextAction = new Date(`${nextActionDate}T10:00:00+05:30`);
  const newNotes = buildNotes(body);
  const attribution = {
    last_landing_page: clean(body.landingPage),
    last_referrer: clean(body.referrer),
    utm_source: clean(body.utmSource),
    utm_medium: clean(body.utmMedium),
    utm_campaign: clean(body.utmCampaign),
    utm_content: clean(body.utmContent),
    utm_term: clean(body.utmTerm),
  };
  let leadId = existingLead?.id as string | undefined;
  const leadPayload = {
    client_name: clean(body.company) || name,
    contact_person: name,
    phone: clean(body.phone),
    normalized_phone: phone,
    email,
    normalized_email: email,
    source,
    notes: existingLead?.notes
      ? `${existingLead.notes}\n\n--- Repeat website enquiry ---\n${newNotes || "No message provided."}`
      : newNotes,
    next_action_type: "Call",
    next_action_at: nextAction.toISOString(),
    follow_up_priority: "High",
    responsible_employee_id: existingLead?.responsible_employee_id || founderEmployee?.id || null,
    last_enquiry_at: new Date().toISOString(),
    enquiry_count: Number(existingLead?.enquiry_count || 0) + 1,
    ...attribution,
  };
  const leadResult = existingLead
    ? await supabase.from("leads").update(leadPayload).eq("id", existingLead.id).select("id").single()
    : await supabase.from("leads").insert([{ ...leadPayload, venture_id: venture.id, pipeline_stage: "New", lead_temperature: "Warm", first_enquiry_at: new Date().toISOString(), first_landing_page: clean(body.landingPage) }]).select("id").single();
  if (leadResult.error || !leadResult.data) {
    return Response.json(
      { error: leadResult.error?.message || "Unable to save enquiry." },
      { status: 500 }
    );
  }
  leadId = leadResult.data.id;

  const { error: historyError } = await supabase.from("website_enquiries").insert([{
    venture_id: venture.id, lead_id: leadId, source, name, email, phone: clean(body.phone),
    company: clean(body.company), message: buildNotes(body), landing_page: clean(body.landingPage),
    referrer: clean(body.referrer), utm_source: clean(body.utmSource), utm_medium: clean(body.utmMedium),
    utm_campaign: clean(body.utmCampaign), utm_content: clean(body.utmContent), utm_term: clean(body.utmTerm),
    user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
  }]);
  if (historyError) {
    return Response.json({ error: "Enquiry was matched, but its history could not be recorded." }, { status: 500 });
  }

  const [activityResult, todayResult] = await Promise.all([
    supabase.from("activity_logs").insert([{ venture_id: venture.id, record_type: "Lead", record_id: leadId, related_lead_id: leadId, action: existingLead ? "repeat_website_enquiry" : "website_enquiry_received", details: { source, landing_page: clean(body.landingPage), campaign: clean(body.utmCampaign) } }]),
    supabase.from("today_action_items").upsert([{ venture_id: venture.id, record_type: "Lead", source_record_type: "Website Enquiry", source_record_id: leadId, title: `Respond to ${clean(body.company) || name}`, description: "New website enquiry requires a personal response.", action_date: nextActionDate, priority: "High", status: "Pending", related_lead_id: leadId, phone: clean(body.phone), email }], { onConflict: "venture_id,source_record_type,source_record_id" }),
  ]);

  let emailForwarded = true;

  try {
    await forwardToFormspree(body);
  } catch {
    emailForwarded = false;
  }

  return Response.json({
    ok: true,
    duplicate: Boolean(existingLead),
    emailForwarded,
    internalNotificationCreated: !activityResult.error && !todayResult.error,
  });
}
