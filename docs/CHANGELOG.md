# CHANGELOG — decisions and learnings, newest first

Every PR appends an entry here. Format: date · change · why · what was learned.

---

## 2026-07-23 — Audit findings F1–F4 fixed

**Change:**
- **F1:** the six Rec & Parks-scoped activity rules (landscape alteration, sign/bench/fencing removal, digging/staking/drilling, nailing/bolting, vehicles on grass, condors/cranes/jibs) no longer fire as universal blockers. They are asked as one `recParksActivities` multiselect (values = rule IDs from `REC_PARKS_SCOPED_ACTIVITY_IDS`, same pattern as `locationTypes`), shown only when `isRecParkProperty` is true, and `evaluate.ts` gates them the same way. The six `hasX` booleans were removed from `ShootInput` (decided by Gabby 2026-07-23: one multiselect instead of six toggles — same per-rule blocker IDs for the suggestions engine, shorter form, fits the future main-flow confirm step). Companion change: `isRecParkProperty` is now shown for the `park` location type too (previously only `city_buildings`) via a new `visibleWhen.includesAny` — otherwise park shoots, the typical Rec & Parks case, would never have been asked and the six rules would silently never fire.
- **F2:** qualifies copy now says "three or fewer filming locations" (was "a single location").
- **F3:** applying >1 month ahead is no longer a `doesNotQualify` blocker. New rule category `timing` and result field `timingNotices: Rule[]` — the notice names the apply-on-or-after date and never affects state. Rendered as a "Submission Timing" card on the results page.
- **F4:** `locationCount` helpText now says parking/base camp locations are free and don't count.
- Tests: 85 → 111 (26 new: per-flag F1 on/off Rec & Parks, F3 timing-notice scenarios incl. coexistence with real blockers, F2/F4 copy and schema assertions, form-gating checks).

**Why:** F1 wrongly disqualified shoots (e.g. a private stage nailing a temporary sign to its own set wall); F3 framed a wait-and-resubmit constraint as ineligibility; F2/F4 were misleading copy. All four verified against the live FilmLA KB page before editing rule logic, per CLAUDE.md sourcing rules (re-verified 2026-07-23: the six rules appear ONLY under "Limits Applying to Recreation & Parks Locations"; advance window is "up to a month in advance of your first activity date").

**Learned:** gating questions behind a conditional field requires checking the *gate's own* visibility — `isRecParkProperty` was only shown for city buildings, so gating on it without widening its trigger would have traded over-blocking for silent under-blocking at parks. The `timingNotices` list is a new result surface; the main-flow integration must render it.

---

## 2026-07-23 — Living docs established (this PR)

**Change:** Added `CLAUDE.md` (rules of engagement), `docs/OVERVIEW.md` (as-built map + verified spec), this changelog. No code changes.

**Why:** A plan document produced in an external AI session described a Supabase permit-type backend that does not exist in this repo. The drift went unnoticed because no versioned, as-built document lived next to the code. These docs are the fix: the overview is the source of truth, and every PR must keep it true.

**Learned (2026-07-23 audit):**
- The Low Impact Pre-Check feature was already fully implemented and merged (PR #4) — client-side deterministic rules, matching the original product brief, not the external plan's imagined architecture.
- All fees verified against FilmLA's live KB page, including the previously unverified Standard Tier figures ($931 / $232/location / $287 spot check — all on the KB fee table).
- Rules previously suspected missing (hours-as-blocker, 1-month advance window, the six "extra" activity flags) are all real — the six extras are genuine but scoped by FilmLA to Recreation & Parks locations only, which the code doesn't yet respect (open item F1).
- Four defects identified (F1–F4, see OVERVIEW.md § Open items). Fix PR to follow this one.
- 85/85 tests passing at audit time.
- **Product decision (Gabby, 2026-07-23):** Low Impact must not live as a separate questionnaire page — the app should detect eligibility automatically from the main flow's existing shoot inputs and adjust the fee, with a short confirm step only for inputs the main flow doesn't capture. Standalone `/low-impact-precheck` page to be removed in the integration PR. Order: F1–F4 fixes first, integration second. See OVERVIEW.md § Direction decided.

---

## 2026-07-?? — Low Impact Pre-Check shipped (PR #4, pre-changelog)

**Change (retroactive entry):** `feat/low-impact-precheck` merged — rules engine, evaluator, form, suggestions, scenarios, copy/disclaimers/ToS, 21 evaluator tests, route `/low-impact-precheck`.

**Notes:** Built against the FilmLA KB with per-rule `sourceUrl`s and in-code hazard annotations (id-based rule lookup, holiday-aware business days, jurisdiction gate, Rec & Parks exemption handling on the location side). Exact merge date not recorded here; see git history.
