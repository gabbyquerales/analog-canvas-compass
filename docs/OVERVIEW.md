# KAIRO — As-Built Overview

**Last updated:** 2026-07-23 (repo audit @ commit 63e257e, PR #4 merge)
**Maintenance rule:** any PR that makes this document wrong must update it. See `CLAUDE.md`.

## What this app is

KAIRO is a film-permit planning tool for production teams. Its first shipped wedge is the **LA Low Impact Pre-Check**: a rule-based screener that estimates whether a planned City of Los Angeles shoot is likely to qualify for FilmLA's Low Impact Permit Pilot Program, shows the fee comparison vs Standard Tier, and suggests how to qualify. It is an estimating tool — it does not file permits and does not guarantee approval.

## Architecture

Vite + React + TypeScript SPA (Lovable-originated, shadcn/ui + Tailwind). **All permit logic is deterministic client-side TypeScript** — there is no permit backend.

| Layer | Reality |
|---|---|
| Frontend | React SPA, routes in `src/App.tsx` |
| Rules engine | `src/features/low-impact-precheck/` — pure functions, data-driven rules |
| Fee data | `src/data/filmla-base-fees.json` — sourced, per-fee `last_verified` dates |
| Supabase | **Only** a `cdtfa-proxy` edge function (`supabase/functions/`). No tables, no permit data model. |
| Tests | Vitest — 85 tests passing as of 2026-07-23 (`npx vitest run`) |

## Map

```
src/
├── pages/            Index, SearchPage, ComparisonPage, TimelinePage,
│                     LowImpactPreCheckPage (route: /low-impact-precheck), NotFound
├── features/low-impact-precheck/
│   ├── rules.ts        ACTIVITY_FLAGS (25), LOCATION_FLAGS (13), REVIEW_TRIGGERS (3),
│   │                   THRESHOLDS, DEADLINES (incl. pilot sunset), FEE_MATH
│   ├── evaluate.ts     evaluate(input) → state + blockers + reviewTriggers + feeMath
│   ├── formSchema.ts   questionnaire definition (sections, labels, helpText)
│   ├── businessDays.ts holiday-aware (US-CA) business-day counting
│   ├── suggest.ts      tiered "how to qualify" suggestions (e.g. split-the-shoot)
│   ├── scenarios.ts    4 seed scenarios (qualifies / too-many-locations / drone / rec-parks)
│   ├── copy.ts, disclaimers.ts, TermsOfUse.tsx
│   └── __tests__/      21 evaluator tests
├── lib/              feeCalculator.ts (+63 tests), jurisdiction.ts, cdtfa.ts, mapbox.ts
├── data/             filmla-base-fees.json, jurisdictions.json, activities.json
└── integrations/supabase/   client + generated types
```

Not yet audited in depth: `feeCalculator.ts` internals, SearchPage/ComparisonPage/TimelinePage, `cdtfa` flow, MapEngine. Audited and verified: the entire low-impact-precheck feature.

## Verified spec — FilmLA Low Impact Permit Pilot

Source: [FilmLA KB — Low Impact Permit Pilot Program](https://info.filmla.com/general-information/low-impact-permit-pilot-program), verified 2026-07-23.

| Item | Value | In code |
|---|---|---|
| Application fee | $350 | `FEE_MATH.lowImpact.application` |
| Notification fee | $156 per **filming** location (parking/base camp free) | `FEE_MATH.lowImpact.notificationPerLocation` |
| LAFD spot check | Waived | `FEE_MATH.lowImpact.lafdSpotCheck = 0` |
| Standard tier (comparison) | $931 app · $232/location · $287 spot check | `FEE_MATH.standard` — all on the KB fee table |
| Eligibility | ≤3 filming locations · ≤3 consecutive days · ≤30 cast/crew on set · City of LA only | `THRESHOLDS` + jurisdiction gate |
| Prohibited activities | 19 general (KB list, verbatim) + 6 Rec & Parks-scoped | `ACTIVITY_FLAGS` — the 6 asked as one `recParksActivities` multiselect (rule-ID values), gated behind `isRecParkProperty` in form + evaluator (F1 fixed 2026-07-23) |
| Prohibited locations | 13 (KB list, verbatim) | `LOCATION_FLAGS` |
| Hours | Outside 7am–10pm wk / 9am–10pm wknd → Standard permit only | blocker `hours_outside_standard` — verified correct |
| Advance window | Apply ≤1 month before first activity | timing notice `deadline_too_early` (`timingNotices` on the result — a submit-later constraint, never affects state; F3 fixed 2026-07-23) |
| Lead time | 3 full business days (10am cutoff documented, not enforced — date-only input) | `businessDays.ts` |
| Pilot window | Began 2026-04-27, six months. Exact end **UNVERIFIED**; code sunset 2026-10-31 (conservative) | `DEADLINES.sunsetISO` |

Pricing formula: `350 + (filmingLocations × 156)` → 1 loc $506 · 2 loc $662 · 3 loc $818.

## Open items

- **Pilot-expiry guard:** re-verify fees/availability on the FilmLA page ~2026-10-13; update `DEADLINES`/`FEE_MATH` or retire the feature per what FilmLA publishes.
- **Deferred by decision 2026-07-23 (revisit after pilot window):** (a) the advance-window check approximates "a month" as 30 days — acceptable while no exact apply-date is shown to users; (b) a shoot dated past the pilot sunset can show both the sunset blocker and the too-early timing notice.
- ~~Known UI-state issue: hidden fields kept stale values~~ **Fixed 2026-07-23:** `pruneHiddenFields()` in `formSchema.ts` resets every hidden field to its default before evaluation (cascades through gate chains, e.g. locationTypes → isRecParkProperty → recParksActivities). Any future consumer of the form schema (incl. the main-flow confirm step) should prune before calling `evaluate()`.
- **F1–F4 from the 2026-07-23 audit: fixed 2026-07-23** (full finding detail in AUDIT.md, Gabby's records; fix details in `docs/CHANGELOG.md`). Result surfaces now include a fourth list, `timingNotices`, alongside blockers and review triggers — the main-flow integration must render it too.

## Direction decided 2026-07-23: integrate Low Impact into the main flow

The standalone `/low-impact-precheck` page will be **removed**. Low Impact becomes automatic tier detection inside the main flow (SearchPage → ProductionBrief → `feeCalculator`): the app evaluates the user's existing shoot inputs against the Low Impact rules engine and, when the shoot likely qualifies, surfaces the Low Impact fee with a short confirm step for inputs the main flow doesn't capture (prohibited location types + finer activity flags). Three-state logic (`qualifies / needsReview / doesNotQualify`) is preserved — main-flow inputs alone can prove a definitive "no", never an unconditional "yes".

Build order: (1) fix F1–F4 in the rules engine first, (2) then the integration PR — adapter mapping `ShootInputs` → rules-engine input, tier switch in `feeCalculator`, banner + confirm step in ProductionBrief, remove the standalone page and route. The rules engine module (`src/features/low-impact-precheck/`) stays — it is pure logic consumed by the main flow.

## Sources

- FilmLA Low Impact KB: https://info.filmla.com/general-information/low-impact-permit-pilot-program (verified 2026-07-23)
- FilmLA Basic Fees List: https://info.filmla.com/filming-related-fees/filmla-basic-fees-list (per-fee `last_verified` in `filmla-base-fees.json`)
- Original product brief: `LowImpactOverview.pdf` (Gabby's records, outside repo)
