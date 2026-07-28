# Phase 18 — Business Settings Cleanup

Phase 18 makes the settings page safer and easier to use during normal
operations.

## Everyday settings

The main form now contains:

- Business and legal names
- Contact email, phone, website, and address
- GST or tax identifier
- Bank and UPI details
- Invoice and proposal prefixes
- Default payment terms
- Currency
- Time zone
- The explicit default business context

Changing the default business is a separate reviewed action. Saving ordinary
company details cannot silently switch the portal to another business.

## Advanced settings

The following controls remain available but are collapsed:

- Monthly collection target
- No-contact, stuck-lead, and client-update warning periods
- Numeric lead-scoring weights
- Technical integration information

Each advanced section explains its effect. Calendar-provider identifiers remain
read-only on this page and must be managed through the Calendar integration
workflow.

## Validation and defaults

- Currency defaults to `INR`.
- Time zone defaults to `Asia/Kolkata`.
- Prefixes accept only letters, numbers, and hyphens, up to 12 characters.
- Text fields have explicit length limits.
- Supported currencies and time zones are database constrained.
- Lead scores are recalculated after settings are saved.

## Deployment

1. Run `PHASE_17_EMPLOYEES_VENTURES_UPGRADE.sql` if it has not already been
   applied.
2. Run `PHASE_18_BUSINESS_SETTINGS_CLEANUP_UPGRADE.sql`.
3. Open **More → Business settings**.
4. Confirm Groenics is the default business, currency is INR, and time zone is
   India (`Asia/Kolkata`).
5. Save once and confirm the success state appears.
