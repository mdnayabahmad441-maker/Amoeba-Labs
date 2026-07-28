# Phase 16 — Website Enquiry Quality

Phase 16 turns the public contact and assessment forms into a safer CRM intake
pipeline.

## What it adds

- Server-side validation and field-length limits
- IP and email rate limits
- A hidden honeypot and basic link/phrase spam filtering
- Lowercase email and digits-only phone normalization
- India country-code normalization for 10-digit phone numbers
- Duplicate matching by normalized email first, then phone
- Repeat-enquiry history without creating another lead
- Landing page, referrer, and UTM campaign attribution
- A complete `website_enquiries` audit history
- A high-priority lead follow-up scheduled for 10:00 AM India time the next day
- An activity-log entry and a corresponding Today command-centre action
- Best-effort Formspree email forwarding after the portal record is safely stored

## Deployment

1. Run `PHASE_16_WEBSITE_ENQUIRY_QUALITY_UPGRADE.sql` in Supabase after the
   Phase 8 activity-log and Today command-centre migrations.
2. Confirm the deployment has `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`. The public endpoint deliberately does not use
   the browser anonymous key for privileged CRM writes.
3. Submit one contact-form test and one assessment-form test.
4. Submit the same email again and confirm the existing lead's
   `enquiry_count` increases while `website_enquiries` receives a new row.

## Operational note

The current rate limiter is process-local. It protects a single running
instance, which is appropriate for the current deployment stage. If the site
is later scaled to several server instances, move the counters to a shared
store such as Redis or a database-backed rate-limit table.
