# Phase 6: Progressive Lead Qualification

## Outcome

The lead form now supports fast capture first and deeper qualification only when the opportunity progresses. A founder can save a new lead without completing scoring or advanced discovery fields.

## Default lead form

The default view shows:

- business or organization;
- contact person;
- phone or WhatsApp;
- email;
- lead source;
- business type;
- location;
- main business problem;
- urgency;
- budget range;
- expected project value;
- pipeline stage;
- lead temperature;
- responsible person;
- next action;
- next-action date;
- priority;
- notes.

## Collapsed sections

### Action context

Optional next-action context is collapsed:

- communication channel;
- last-contact timestamp;
- expected outcome;
- follow-up context.

### Advanced qualification

Detailed discovery and scoring fields are collapsed:

- industry;
- company size;
- number of branches;
- buying timeline;
- current workaround;
- existing software;
- decision-maker information;
- competitor;
- problem severity;
- authority;
- need;
- ability to pay;
- engagement;
- timeline fit;
- founder/company fit;
- closing probability;
- detailed qualification notes.

Empty advanced fields reduce score confidence but never prevent saving.

## Progressive guidance

The form changes its guidance according to the canonical pipeline:

| Pipeline stage | Recommended information |
|---|---|
| New | Minimal contact information |
| Contacted / Meeting-Demo | Problem, urgency, and decision-maker access |
| Qualified | Budget, timeline, expected value, and fit |
| Proposal / Negotiation | Final requirements, authority, and commercial details |
| Won | Prepare for the later client-conversion workflow |
| Lost | Record a specific loss reason |

## Required exceptions

Only data-integrity requirements remain mandatory:

- organization name;
- pipeline stage;
- lead temperature;
- priority;
- lost reason when pipeline is Lost;
- disqualification reason when temperature is Unqualified.

No database migration is required for Phase 6. It uses the Phase 3 scoring fields and Phase 5 canonical pipeline.

## Verification checklist

1. Create a lead using only organization and minimal contact information.
2. Confirm advanced qualification is collapsed initially.
3. Expand it and confirm existing advanced values remain editable.
4. Move through pipeline stages and verify the guidance changes.
5. Confirm empty scoring fields do not block saving.
6. Confirm Lost requires a reason.
7. Confirm Unqualified requires a reason.
8. Test the form at mobile width and confirm fields stack vertically.
9. Confirm keyboard users can open both disclosure sections.
