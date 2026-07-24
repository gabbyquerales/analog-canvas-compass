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
├── pages/            Index, SearchPage, ComparisonPage, TimelinePage, NotFound
├── components/       MapEngine, InfoCards, ProductionBrief (hosts the Low Impact
│                     banner + confirm step + tier-switched ledger)
├── features/low-impact-precheck/
│   ├── rules.ts        ACTIVITY_FLAGS (25), LOCATION_FLAGS (13), REVIEW_TRIGGERS (3),
│   │                   REC_PARKS_SCOPED_ACTIVITY_IDS, THRESHOLDS, DEADLINES, FEE_MATH
│   ├── evaluate.ts     evaluate(input) → state + blockers + reviewTriggers + timingNotices + feeMath
│   ├── mainFlowAdapter.ts  ShootInputs → rules input · detectLowImpactPotential
│   │                       (definitive-no only) · evaluateWithConfirm
│   ├── LowImpactConfirmStep.tsx  confirm sheet (date, hours, location types,
│   │                             Rec & Parks gate, additional activities)
│   ├── formSchema.ts   field definitions + isFieldVisible/pruneHiddenFields
│   ├── businessDays.ts holiday-aware (US-CA) business-day counting
│   ├── suggest.ts      tiered "how to qualify" suggestions (e.g. split-the-shoot)
│   ├── scenarios.ts    4 seed scenarios (qualifies / too-many-locations / drone / rec-parks)
│   ├── copy.ts, disclaimers.ts, TermsOfUse.tsx
│   └── __tests__/      evaluator, formSchema, mainFlowAdapter tests
├── lib/              feeCalculator.ts (lowImpactTier switch; +73 tests), jurisdiction.ts, cdtfa.ts, mapbox.ts
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

- **Pilot-expiry guard:** re-verify fees/availability on the FilmLA page ~2026-10-13; update `DEADLINES`/`FEE_MATH` or retire the feature per what FilmLA publishes. Note: banner detection deliberately ignores deadline rules, so post-sunset the banner would stay optimistic until the confirm step's real date blocks it — retiring on time matters.
- **Lovable copy to-do:** the brief's "Locations" stepper needs the F4-style note ("count filming locations only — parking/base camp don't count"); over-counting can falsely kill Low Impact potential and inflates the notification estimate.
- **Deferred by decision 2026-07-23 (revisit after pilot window):** (a) the advance-window check approximates "a month" as 30 days — acceptable while no exact apply-date is shown to users; (b) a shoot dated past the pilot sunset can show both the sunset blocker and the too-early timing notice.
- ~~Notification-fee granularity~~ **Resolved 2026-07-23:** re-verified both sources. FilmLA's Basic Fees List bills notification "per Radius"; the Low Impact KB fee table publishes the standard rate as "$232 / location". The ledger now estimates one radius per filming location ($232 × locations, marked `isEstimate` when >1, with a note that shared radii may lower it). Previously it charged a single flat $232 — under-charging every multi-location standard shoot.
- ~~Deferred: no submit validation on the standalone form~~ **Resolved 2026-07-23 by the integration:** the standalone page was removed; the confirm step requires the filming date before evaluating, and all other inputs come from the Production Brief's own steppers (min 1).
- ~~Known UI-state issue: hidden fields kept stale values~~ **Fixed 2026-07-23:** `pruneHiddenFields()` in `formSchema.ts` resets every hidden field to its default before evaluation (cascades through gate chains, e.g. locationTypes → isRecParkProperty → recParksActivities). Any future consumer of the form schema (incl. the main-flow confirm step) should prune before calling `evaluate()`.
- **F1–F4 from the 2026-07-23 audit: fixed 2026-07-23** (full finding detail in AUDIT.md, Gabby's records; fix details in `docs/CHANGELOG.md`). Result surfaces now include a fourth list, `timingNotices`, alongside blockers and review triggers — the main-flow integration must render it too.

## Low Impact in the main flow (integrated 2026-07-23)

The standalone `/low-impact-precheck` page is **gone**. Low Impact is automatic tier detection inside the main flow (SearchPage → ProductionBrief → `feeCalculator`):

1. **Detection** — `detectLowImpactPotential(briefInputs)` runs on every Production Brief change. It maps the brief's inputs to the rules engine (activities: street_closure→lane closures, gunfire_sfx→gunfire, pyrotechnics→special effects, drone_aerial→aerial, animals, stunts; Parks chip→`isRecParkProperty`; thresholds from days/crew/locations) and can prove a definitive "no" (no banner). It can NEVER prove a "yes" — deadline rules are excluded (the brief has no dates). Banner shows only for LA City motion, non-student, non-profit shoots (other tiers are already cheaper than $350).
2. **Confirm step** — `LowImpactConfirmStep` collects what the brief doesn't capture: first filming date, **total cast & crew on set** (the brief's "Crew" stepper excludes cast, so it alone can't prove the ≤30 threshold — prefilled with crew count), hours, prohibited location types, the Rec & Parks gate + scoped activities, and the finer activity flags (`ADDITIONAL_ACTIVITY_OPTIONS`). Requires the date before submitting.
3. **Evaluation** — `evaluateWithConfirm` merges both input sets and runs the full deterministic engine. Result re-computes automatically if brief inputs change afterward.
4. **Tier switch** — on `qualifies`/`needsReview`, `calculateFees({ lowImpactTier: true })` swaps: application $931→$350, notification $232/radius→$156×filming locations, LAFD spot check $287→waived ($0 line). Eligibility is the caller's job; the flag is ignored for non-LA/student/non-profit/still inputs.
5. **FilmLA Monitor is need-based, not universal** (fixed 2026-07-24): assigned for "filming that occurs on City-owned property, complicated filming activity and frequently filmed areas" (filmla.com/filml-monitors-ambassadors-location-filming, verified 2026-07-24; base-fees data agrees: `requirement_level: conditional`). The line only appears when a trigger is present (any special activity, or parks/port/beach/flood-control property), marked as a toggleable conditional estimate. Shoots that qualify for Low Impact have no flagged activities, so they naturally carry no monitor unless on Rec & Parks property.
6. The result card shows state badge, blockers/review triggers/timing notices, top "how to qualify" repackaging suggestions from `suggest.ts` (e.g. split-the-shoot), and the standard disclaimer.

**Documented assumptions:** the brief's "Days" stepper is treated as consecutive filming days (no gap concept — 4+ days reads as a definitive no); `water_effects` maps to nothing (not prohibited); `night_shoot` never blocks detection (it can't prove filming past 10pm) but **prefills the confirm step's hours toggle to ON**, with copy telling the user to turn it off if they wrap by 10pm. Dates use the browser's local calendar date (not UTC) so late-evening users aren't docked a business day. Verified end-to-end in-browser 2026-07-24 (post monitor fix): plain Echo Park shoot, crew 20, 1 location — $1,450 standard (931+232+287, no monitor) → **$506** Low Impact (350+156+waived), matching the spec-table pricing formula exactly; on-set total of 35 correctly flips to doesNotQualify with the footprint suggestion shown.

## Sources

- FilmLA Low Impact KB: https://info.filmla.com/general-information/low-impact-permit-pilot-program (verified 2026-07-23)
- FilmLA Basic Fees List: https://info.filmla.com/filming-related-fees/filmla-basic-fees-list (per-fee `last_verified` in `filmla-base-fees.json`)
- Original product brief: `LowImpactOverview.pdf` (Gabby's records, outside repo)
