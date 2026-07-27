# CHANGELOG — decisions and learnings, newest first

Every PR appends an entry here. Format: date · change · why · what was learned.

---

## 2026-07-24 — MCP server added via Lovable, then removed same day

**Change:** A Lovable session (commits `83b5158`…`fd12b11`, direct to main, no PR/changelog — retroactive entry) added a public MCP server: a ~2,800-line `supabase/functions/mcp` edge function plus `src/lib/mcp/` tool wrappers exposing `calculate-permit-fees` and `evaluate-low-impact-precheck`, a `.lovable/mcp` manifest, the `@lovable.dev/mcp-js` dependency, and dependency upgrades (`supabase-js`, `posthog-js`, `zod` 3→4 — **kept**). It also switched the app's Supabase project to a Lovable-managed one (`xmtjjymbpolzzfryfsah`) — **reverted in this PR**: Gabby remixed the Lovable project, and the remix workspace attaches to her own Supabase project (`ehxaweuopfqcxubryiju`), so the repo now points back there (address-confirmation flow verified working against it in-browser). This PR removes the MCP code, manifest, vite plugin, and dependency, and restores `.env`/`config.toml`.

**Why:** Intent was to let Claude access KAIRO's fee/eligibility tools. Gabby decided to remove it during the pilot window (minimal-footprint preference; the endpoint was public and unreviewed). Note the design was sound where it counts: the MCP tools *wrapped* the deterministic engine rather than reimplementing it.

**Learned:**
- Lovable's MCP **toggle does not remove code or undeploy the function** — after disabling, the repo was unchanged and the public endpoint still answered JSON-RPC (HTTP 200, verified 2026-07-24). Code removal needs a repo PR (this one); **undeployment must be requested explicitly in Lovable chat** since the function runs on Lovable's managed project, not Gabby's Supabase account. Endpoint status at time of writing: still live — re-check after asking Lovable to delete it.
- Lovable commits directly to main and skips the living-docs contract — for non-styling features, prefer asking Lovable to work on a branch, or expect to write retroactive entries like this one.

---

## 2026-07-23 — Low Impact integrated into the main flow; standalone page removed

**Change:** Implemented the decided direction (OVERVIEW § Low Impact in the main flow). New `mainFlowAdapter.ts` (ShootInputs→rules mapping, `detectLowImpactPotential` definitive-no detection, `evaluateWithConfirm`); `lowImpactTier` switch in `feeCalculator` ($350 app / $156×filming-location notification / spot check waived, sourced from `FEE_MATH`); banner + `LowImpactConfirmStep` + result card in ProductionBrief (functional styling — Lovable to restyle); deleted `LowImpactPreCheckPage` + `/low-impact-precheck` route. Rules engine module untouched and consumed as pure logic. Analytics: `low_impact_banner_shown`, `low_impact_confirm_completed`.

**Why:** Product decision 2026-07-23 — Low Impact should be automatic tier detection from existing shoot inputs, not a separate questionnaire.

**Learned:**
- The brief already captures more Low Impact signal than expected: 6 of 8 special activities map directly to prohibition flags, and the Parks chip maps to `isRecParkProperty`. Only dates, hours, prohibited location types, and 14 finer flags needed the confirm step.
- Detection must exclude deadline rules (the brief has no dates) and must skip student/non-profit/still-photo shoots — their existing tiers are cheaper than the $350 Low Impact application, so the banner would be a disservice.
- `night_shoot` is deliberately unmapped: it can't prove "outside 7am–10pm", so blocking on it would repeat the F1 over-blocking mistake. The hours question lives in the confirm step.
- The main flow's standard ledger charged ONE flat $232 notification regardless of location count — **fixed in this PR after re-verifying both sources** (Basic Fees List: "per Radius"; Low Impact KB fee table: "$232 / location"): now $232 × filming locations, marked as an estimate when >1 with a shared-radius caveat. The flat charge had been silently under-charging multi-location standard shoots.
- Review follow-up: `night_shoot` now prefills the confirm step's hours toggle to ON (user can flip it off if wrapping by 10pm) — keeps the F1 lesson (never block on an ambiguous signal) without losing the signal.

**Final review round (2026-07-24, Gabby's holes-check):**
- **FilmLA Monitor is no longer charged unconditionally.** Gabby's call, confirmed by two sources: FilmLA's monitor page — assigned "using need-based criteria" for "City-owned property, complicated filming activity and frequently filmed areas" (filmla.com/filml-monitors-ambassadors-location-filming, verified 2026-07-24) — and our own base-fees data, which always said `requirement_level: conditional` ("may be required depending on production scope and community impact") while the calculator ignored it. Now emitted only when a trigger exists (any special activity, or parks/port/beach/flood-control property), as a toggleable conditional estimate. Plain shoots — and typical Low Impact qualifiers — carry no monitor line.
- **On-set headcount hole closed:** the brief's "Crew" stepper excludes cast, but FilmLA's threshold is ≤30 total cast & crew — a 20-crew/15-cast shoot was told "Likely Qualifies". The confirm step now asks for the on-set total (prefilled with crew count) and feeds `onSetCount`.
- **Suggestions engine reconnected:** the result card now shows the top repackaging suggestions (split-the-shoot etc.) for blocked/review shoots — restoring the standalone page's "how to qualify" value that the integration had dropped.
- **Timezone:** `todayISO` now uses the local calendar date instead of UTC (late-evening users were being docked one business day of notice).
- Tests 153 → 156.
- Tests 152 → run `npx vitest run`: adapter mapping/detection/confirm (25), fee tier switch (10), plus all prior suites. Verified in-browser at the time: $2,028.50 → $1,084.50 (delta $944, exact). *(Superseded by the monitor fix below — final verified numbers: $1,450 standard → $506 Low Impact for the same shoot.)*

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
