# Jurisdiction rule packs

Versioned JSON packs that guide the issue classifier and proposal drafter.

## Format (example)

```json
{
  "jurisdiction": "US-CA",
  "version": "2026.1",
  "habitability_standards": ["heat", "water", "structural"],
  "repair_timeline_days": { "emergency": 1, "urgent": 3, "normal": 30 },
  "rent_abatement_notes": "Consult counsel – not legal advice",
  "disclaimer": "This pack is informational only and must be reviewed by a licensed attorney."
}
```

## Rules

1. Never ship a pack without attorney review for that jurisdiction.
2. Version every change; store in git and load by jurisdiction + version at runtime.
3. RAG over statutes is optional and must cite sources; still require human review.
