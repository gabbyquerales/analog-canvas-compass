# CHANGELOG — decisions and learnings, newest first

Every PR appends an entry here. Format: date · change · why · what was learned.

---

## 2026-07-23 — Low Impact integrated into the main flow; standalone page removed

**Change:** Implemented the decided direction (OVERVIEW § Low Impact in the main flow). New `mainFlowAdapter.ts` (ShootInputs→rules mapping, `detectLowImpactPotential` definitive-no detection, `evaluateWithConfirm`); `lowImpactTier` switch in `feeCalculator` ($350 app / $156×filming-location notification / spot check waived, sourced from `FEE_MATH`); banner + `LowImpactConfirmStep` + result card in ProductionBrief (functional styling — Lovable to restyle); deleted `LowImpactPreCheckPage` + `/low-impact-precheck` route. Rules engine module untouched and consumed as pure logic. Analytics: `low_impact_banner_shown`, `low_impact_confirm_completed`.

**Why:** Product decision 2026-07-23 — Low Impact should be automatic tier detection from existing shoot inputs, not a separate questionnaire.

**Learned:**
- The brief already captures more Low Impact signal than expected: 6 of 8 special activities map directly to prohibition flags, and the Parks chip maps to `isRecParkProperty`. Only dates, hours, prohibited location types, and 14 finer flags needed the confirm step.
- Detection must exclude deadline rules (the brief has no dates) and must skip student/non-profit/still-photo shoots — their existing tiers are cheaper than the $350 Low Impact application, so the banner would be a disservice.
- `night_shoot` is deliberately unmapped: it can't prove "outside 7am–10pm", so blocking on it would repeat the F1 over-blocking mistake. The hours question lives in the confirm step.
- The main flow's standard ledger charges ONE $232 notification "per radius"; the pre-check's standard comparison charged $232×locations. Not reconciled here (UNVERIFIED which FilmLA billing granularity is right for multi-location shoots) — flagged as an open item.
- Tests 152 → run `npx vitest run`: adapter mapping/detection/confirm (25), fee tier switch (10), plus all prior suites. Verified in-browser: $2,028.50 → $1,084.50 (delta $944, exact).

---

## 2026-07-23 — Audit findings F1–F4 fixed

**Change:**
- **F1:** the six Rec & Parks-scoped activity rules (landscape alteration, sign/bench/fencing removal, digging/staking/drilling, nailing/bolting, vehicles on grass, condors/cranes/jibs) no longer fire as universal blockers. They are asked as one `recParksActivities` multiselect (values = rule IDs from `REC_PARKS_SCOPED_ACTIVITY_IDS`, same pattern as `locationTypes`), shown only when `isRecParkProperty` is true, and `evaluate.ts` gates them the same way. The six `hasX` booleans were removed from `ShootInput` (decided by Gabby 2026-07-23: one multiselect instead of six toggles — same per-rule blocker IDs for the suggestions engine, shorter form, fits the future main-flow confirm step). Companion change: `isRecParkProperty` is now shown for the `park` location type too (previously only `city_buildings`) via a new `visibleWhen.includesAny` — otherwise park shoots, the typical Rec & Parks case, would never have been asked and the six rules would silently never fire.
- **F2:** qualifies copy now says "three or fewer filming locations" (was "a single location").
- **F3:** applying >1 month ahead is no longer a `doesNotQualify` blocker. New rule category `timing` and result field `timingNotices: Rule[]` — the notice explains the submission window and never affects state. Rendered as a "Submission Timing" card on the results page. Deliberately shows no precise apply-on-or-after date: the window check approximates "a month" as 30 days, and surfacing an exact date would present that approximation as precise (deferred by Gabby 2026-07-23, revisit after the pilot window along with the sunset/timing message overlap).
- **F4:** `locationCount` helpText now says parking/base camp locations are free and don't count.
- **Self-review fix (hidden-field staleness):** hiding a form field is render-only, so a stale answer (e.g. `isRecParkProperty: true` after the park location type was deselected) could silently skew evaluation. New `pruneHiddenFields()` + `isFieldVisible()` in `formSchema.ts` reset hidden fields to defaults before `evaluate()`; the page's submit handler now prunes. Pre-existing bug, surfaced by red-team review because F1 made the gate field load-bearing.
- **Review fixes (2026-07-23 full pass):** (a) removed the now-dead `deadline_too_early` mapping from the `timing_fixes` suggestion (timing notices are never passed to `rankSuggestions`; the timing card carries its own guidance) and added a guard test asserting every suggestion `appliesTo` id is actually reachable; (b) the fee-comparison table now reads Standard-tier figures from `FEE_MATH` instead of hardcoded `$931`/`$287` literals, so the October fee re-verification propagates to the UI (also fixed a `$$`/`$Waived` double-prefix in the spot-check cell). Submit validation on the standalone form deliberately deferred — see OVERVIEW § Open items.
- Tests: 85 → 117 (per-flag F1 on/off Rec & Parks, F3 timing-notice scenarios incl. coexistence with real blockers, F2/F4 copy and schema assertions, form-gating checks, hidden-field pruning incl. the stale-toggle repro and gate-chain cascade, suggestion-reachability guard).

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
