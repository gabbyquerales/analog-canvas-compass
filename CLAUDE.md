# CLAUDE.md — Rules of Engagement for KAIRO (analog-canvas-compass)

This file is read by every AI session (Claude, Lovable, or other) working on this repo.
**Before changing anything, read `docs/OVERVIEW.md`.** It is the as-built map of the app.

## The living-docs contract

1. **`docs/OVERVIEW.md` is the source of truth** for what this app is and how it works. If your change makes it wrong, updating it is part of your change — same branch, same PR.
2. **Every PR appends an entry to `docs/CHANGELOG.md`** (newest first): date, what changed, why, what was learned. No silent changes.
3. If you find that reality and OVERVIEW.md disagree, fix the doc and note the drift in the changelog. Do not build on top of a doc you know is wrong.

## Sourcing rules (non-negotiable)

- Every fee, threshold, date, or eligibility rule in code must trace to a cited source URL with a `last_verified` date (see `src/data/filmla-base-fees.json` for the pattern, and `sourceUrl` on every rule in `src/features/low-impact-precheck/rules.ts`).
- Anything that cannot be cited is marked **UNVERIFIED** in code comments and in OVERVIEW.md.
- FilmLA rules change. Re-verify against the source URL before editing rule logic — do not trust the doc's numbers over the live page.

## Engineering rules

- The Low Impact rules engine (`src/features/low-impact-precheck/`) is **deterministic client-side TypeScript**. No AI inference in qualification logic. AI may explain results; it may not decide them.
- Result states are `qualifies / needsReview / doesNotQualify / notApplicable`. Never collapse to binary.
- Copy never says "approved", "guaranteed", or "eligible" as a promise — always "likely", "estimate". Disclaimers in `disclaimers.ts` stay on every result surface.
- Tests must pass before any merge: `npx vitest run`. New rules require new tests. Changed rules require changed tests in the same PR.
- Supabase schema changes only via migrations. (Currently Supabase hosts only the `cdtfa-proxy` edge function — no permit data model exists. Do not invent one without a decision recorded in the changelog.)
- Lovable and GitHub two-way sync: logic changes go through PRs on this repo; visual/styling iteration may go through Lovable. Do not have both edit the same files in the same window.

## Current watch items

- **Pilot sunset:** the FilmLA Low Impact pilot nominally ends ~2026-10-27/31 (exact date UNVERIFIED — FilmLA has not published it). Re-verify fees and program availability before that window; see OVERVIEW.md § Open items.
