# Phase 7: Simplified Lead Scoring

Phase 7 makes lead temperature the primary commercial decision signal:

- **Hot** — strong buying signals; prioritize the immediate next action.
- **Warm** — a real opportunity with budget, authority, or timeline still to clarify.
- **Cold** — low urgency or engagement; nurture with a dated action.
- **Not ready** — potential fit, but the buying timing is not active.
- **Unqualified** — not a viable opportunity; record the reason and stop active pursuit.

## Portal changes

- The Leads table displays temperature prominently as **Priority**.
- Pipeline stage and temperature are shown as separate business concepts.
- The minimum numeric-score filter has been removed.
- The 0–100 score, confidence, explanation, and system recommendation remain under **Advanced score details**.
- Today prioritizes Hot leads as Urgent and Warm leads as High without numeric score thresholds.
- Lead-scoring weights are collapsed under **Advanced settings** in Business Settings.

## Database impact

No migration is required. Existing scoring columns, functions, and triggers remain intact for diagnostics and future reporting.

## Operating rule

Use temperature plus a clear dated next action for daily decisions. Treat the numeric score as supporting context, not as an automatic verdict.
