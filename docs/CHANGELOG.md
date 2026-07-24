# CHANGELOG — decisions and learnings, newest first

Every PR appends an entry here. Format: date · change · why · what was learned.

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
