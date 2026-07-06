import { createClient } from "@supabase/supabase-js";

type EnquiryBody = {
  source?: string;
  formspreeEndpoint?: string;
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
};

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
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
  if (!body.formspreeEndpoint) {
    return;
  }

  await fetch(body.formspreeEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { error: "Enquiry capture is not configured. Add Supabase environment variables." },
      { status: 500 }
    );
  }

  let body: EnquiryBody;

  try {
    body = (await request.json()) as EnquiryBody;
  } catch {
    return Response.json({ error: "Invalid enquiry payload." }, { status: 400 });
  }

  const name = clean(body.name);
  const email = clean(body.email);

  if (!name || !email) {
    return Response.json({ error: "Name and email are required." }, { status: 400 });
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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ventureError || !venture) {
    return Response.json(
      { error: ventureError?.message || "No active venture found for this enquiry." },
      { status: 500 }
    );
  }

  const { error: leadError } = await supabase.from("leads").insert([
    {
      venture_id: venture.id,
      client_name: clean(body.company) || name,
      contact_person: name,
      phone: clean(body.phone),
      email,
      source: body.source || "Website",
      stage: "New Lead",
      notes: buildNotes(body),
    },
  ]);

  if (leadError) {
    return Response.json(
      { error: leadError.message || "Unable to save enquiry." },
      { status: 500 }
    );
  }

  let emailForwarded = true;

  try {
    await forwardToFormspree(body);
  } catch {
    emailForwarded = false;
  }

  return Response.json({ ok: true, emailForwarded });
}
