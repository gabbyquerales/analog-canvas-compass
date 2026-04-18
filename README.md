# Kairo

**Film Permit Intelligence for Los Angeles.**

Kairo helps independent filmmakers, students, and production teams understand the true cost of filming in LA — where permit fees vary dramatically across 88+ overlapping jurisdictions ("the 88 Kingdoms of LA"). Drop a pin, answer a few questions about your shoot, and get an itemized cost breakdown across FilmLA, jurisdiction, personnel, and location fees.

---

## Table of contents

1. [What the app does](#1-what-the-app-does)
2. [Tech stack](#2-tech-stack)
3. [How fees are calculated](#3-how-fees-are-calculated)
4. [Supabase Edge Function](#4-supabase-edge-function)
5. [Data layer](#5-data-layer)
6. [Frontend architecture](#6-frontend-architecture)
7. [End-to-end execution trace](#7-end-to-end-execution-trace)
8. [Local development](#8-local-development)

---

## 1. What the app does

**User flow:**

1. User searches a location on an LA-focused Mapbox map
2. Kairo reverse-geocodes the pin via California's CDTFA tax API to determine the jurisdiction
3. User confirms the location and fills in a "production brief" (shoot days, crew size, activities like street closures or pyrotechnics)
4. An itemized fee breakdown is computed — **entirely in the browser, no backend call** — across four categories: FilmLA, jurisdiction, personnel, location
5. User can toggle conditional/optional fees for "what-if" scenarios

**Routes:**

| Route | Component | Status |
|-------|-----------|--------|
| `/` | [SearchPage](src/pages/SearchPage.tsx) | Active — map + fee calculator |
| `/timeline` | [TimelinePage](src/pages/TimelinePage.tsx) | Placeholder ("The Deadline") |
| `/comparison` | [ComparisonPage](src/pages/ComparisonPage.tsx) | Placeholder ("LA vs. The World") |

**No authentication.** Kairo is a fully anonymous public tool — no user accounts, no saved estimates, no persisted state.

---

## 2. Tech stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn-ui (Radix primitives)
- **State:** React hooks (`useState`, `useMemo`) + TanStack Query — no Redux, Zustand, or Context
- **Map:** Mapbox GL JS + Turf.js for radius circles
- **Backend:** Supabase (PostgreSQL + one Edge Function for a CORS proxy)
- **Analytics:** PostHog
- **Routing:** React Router

---

## 3. How fees are calculated

**Fee calculation is pure math.** It runs entirely client-side in a single function — [`calculateFees()`](src/lib/feeCalculator.ts) — that assembles a line-item ledger from rules and rates stored in JSON.

### Entry point

[`src/lib/feeCalculator.ts`](src/lib/feeCalculator.ts) — `calculateFees(inputs: ShootInputs): FeeCalculationResult`

### Inputs (ShootInputs)

Defined at [feeCalculator.ts:11](src/lib/feeCalculator.ts#L11):

```ts
{
  jurisdictionSlug: 'los-angeles' | 'los-angeles-county' | 'culver-city',
  shootDays, hoursPerDay, crewSize,
  isMotion, isStudent, isNonProfit,
  selectedActivities: ['street_closure', 'pyrotechnics', ...],
  isWeekend,
  isParksLocation, isBeachLocation, isPortLocation, isFloodControlLocation,
  numberOfLocations, numberOfParkingSpaces,
  prepDays, strikeDays,
  // ...20 fields total
}
```

### Formula structure

Fees are built as a stack of **line items**, each with a `category` (`filmla` / `jurisdiction` / `personnel` / `location`). The total is the sum of all categories.

**Example — FilmLA Monitor fee ([feeCalculator.ts:280](src/lib/feeCalculator.ts#L280)):**

```ts
amount = monitor.rate × (hoursPerDay + 1) × shootDays
// rate from filmla-base-fees.json, +1 hour for early arrival
```

**Example — LA Fire Safety Officer ([feeCalculator.ts:305](src/lib/feeCalculator.ts#L305)):**

```ts
const fireHours = Math.max(minimumHours, hoursPerDay) + travelHours;
amount = rate × fireHours × shootDays
// rate: $127/hr, minimum 4 hrs, +1 travel hour
```

**Example — LAPD Officer (a range estimate, [feeCalculator.ts:330](src/lib/feeCalculator.ts#L330)):**

```ts
const lapdHours = Math.max(minimumHours || 8, hoursPerDay);
amount = avg(rateMin, rateMax) × lapdHours × shootDays
// marked paidDirectly: true (not collected by FilmLA)
```

**Example — LA County Flood Control (highest daily rate, [feeCalculator.ts:536](src/lib/feeCalculator.ts#L536)):**

```ts
const totalFloodDays = shootDays + prepDays + strikeDays;
amount = rate × totalFloodDays  // ~$1,500/day, applies to ALL days
```

### Jurisdiction-specific branches

| Jurisdiction | Key rules | Code |
|--------------|-----------|------|
| **LA City** | FilmLA base + permit riders (`ceil((days-7)/7) × $148.75`), LAPD for closures, Parks/Beach add-ons | [feeCalculator.ts:290-399](src/lib/feeCalculator.ts#L290) |
| **LA County** | County Fire review, Sheriff for closures, Flood Control highest per-diem | [feeCalculator.ts:404-556](src/lib/feeCalculator.ts#L404) |
| **Culver City** | Flat $1,000 app fee, $335/day use fee, Police Officer weekday/weekend tiers | [feeCalculator.ts:561-627](src/lib/feeCalculator.ts#L561) |

### Final total

[feeCalculator.ts:728](src/lib/feeCalculator.ts#L728):

```ts
estimatedTotal = subtotalFilmLA + subtotalJurisdiction + subtotalPersonnel + subtotalLocation
```

### Where the rates live

- [`src/data/filmla-base-fees.json`](src/data/filmla-base-fees.json) — FilmLA base rates (source: info.filmla.com, updated 2025-11-11)
- [`src/data/jurisdictions.json`](src/data/jurisdictions.json) — per-jurisdiction rate tables (1,095 lines)
- [`src/data/activities.json`](src/data/activities.json) — 8 activities with `triggersComplexTimeline` flags

---

## 4. Supabase Edge Function

There is **exactly one** edge function.

### `cdtfa-proxy`

**File:** [`supabase/functions/cdtfa-proxy/index.ts`](supabase/functions/cdtfa-proxy/index.ts)

**Purpose:** A thin CORS proxy to California's CDTFA tax rate API. Given a lng/lat, it returns the city + county that contain the point. We proxy it because the CDTFA endpoint doesn't send CORS headers, so the browser can't call it directly.

**What it does (the entire function):**

```ts
const cdtfaUrl = `https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByLngLat?Longitude=${lng}&Latitude=${lat}`;
const res = await fetch(cdtfaUrl);
const data = await res.json();
return new Response(JSON.stringify(data), { headers: corsHeaders });
```

**Called from:** [`src/lib/cdtfa.ts`](src/lib/cdtfa.ts) → `fetchCdtfaJurisdiction(lng, lat)` at line 34, which is invoked by [`MapEngine.tsx`](src/components/MapEngine.tsx) when a user selects a location.

**Response shape:**

```json
{ "taxRateInfo": [{ "city": "LOS ANGELES", "county": "LOS ANGELES", "rate": 9.5 }] }
```

---

## 5. Data layer

**Schema lives in Supabase** — auto-generated types at [`src/integrations/supabase/types.ts`](src/integrations/supabase/types.ts).

There are **no migration files** in `supabase/migrations/` — the schema is defined via the Supabase dashboard. (Worth fixing eventually so the schema is version-controlled.)

### Tables

| Table | Purpose | Actually queried? |
|-------|---------|-------------------|
| `jurisdictions` | LA City / County / Culver City metadata | **No** — frontend reads from `jurisdictions.json` instead |
| `activity_requirements` | Street closures, pyro, etc. | **No** — frontend reads from `activities.json` |
| `special_condition_areas` | Neighborhood restrictions (Hollywood sign zone, etc.) | **No** — lookup returns `null` stub |
| `comparison_cities` | Other US cities' permit costs | **No** — for future `/comparison` page |
| `v_competitive_analysis` (view) | Computed cost-per-day across cities | **No** |

**The takeaway:** Supabase is set up but effectively unused for reads. All runtime data comes from the JSON files in `src/data/`. The tables are there for future use.

---

## 6. Frontend architecture

### State management

All component-local with React hooks. No global store. The two state trees that matter:

**[`SearchPage.tsx`](src/pages/SearchPage.tsx):** holds the selected location, resolved jurisdiction, confirm state

**[`ProductionBrief.tsx`](src/components/ProductionBrief.tsx):** holds all 17 production inputs (days, crew, activities, etc.) and computes `feeResult` via `useMemo` — so fees recompute instantly on every input change with no re-render thrash.

### Key components

| Component | File | Purpose |
|-----------|------|---------|
| `SearchPage` | [src/pages/SearchPage.tsx](src/pages/SearchPage.tsx) | Main page layout, orchestrates selection state |
| `MapEngine` | [src/components/MapEngine.tsx](src/components/MapEngine.tsx) | Mapbox map + search input + geocoding |
| `InfoCards` | [src/components/InfoCards.tsx](src/components/InfoCards.tsx) | "Report card" showing matched jurisdiction + confirm button |
| `ProductionBrief` | [src/components/ProductionBrief.tsx](src/components/ProductionBrief.tsx) | Fee calculator UI + line-item ledger |
| `BottomNav` | [src/components/BottomNav.tsx](src/components/BottomNav.tsx) | Route navigation |

---

## 7. End-to-end execution trace

Scenario: user searches "Santa Monica Pier", confirms the location, enters 3-day motion shoot with street closure in LA City.

| Step | What happens | File:line |
|------|--------------|-----------|
| 1 | User types in search box (debounced 200ms) | [MapEngine.tsx:240](src/components/MapEngine.tsx#L240) |
| 2 | Call Mapbox Geocoding API | [MapEngine.tsx:194](src/components/MapEngine.tsx#L194) |
| 3 | User clicks a suggestion → `selectPlace()` fires | [MapEngine.tsx](src/components/MapEngine.tsx) |
| 4 | Call `fetchCdtfaJurisdiction(lng, lat)` | [cdtfa.ts:34](src/lib/cdtfa.ts#L34) |
| 5 | Edge function proxies to CDTFA, returns `{city, county}` | [cdtfa-proxy/index.ts:8](supabase/functions/cdtfa-proxy/index.ts#L8) |
| 6 | Normalize CDTFA name ("CITY OF X" → "X") | [cdtfa.ts:11](src/lib/cdtfa.ts#L11) |
| 7 | Look up jurisdiction object from `jurisdictions.json` | [feeCalculator.ts:106](src/lib/feeCalculator.ts#L106) |
| 8 | Parent state updated via `onSelectionChange` callback | [SearchPage.tsx:20](src/pages/SearchPage.tsx#L20) |
| 9 | `InfoCards` renders match, user clicks Confirm | [InfoCards.tsx:40](src/components/InfoCards.tsx#L40) |
| 10 | `ProductionBrief` modal slides up | [ProductionBrief.tsx:341](src/components/ProductionBrief.tsx#L341) |
| 11 | User adjusts inputs → `feeResult = useMemo(...)` recomputes | [ProductionBrief.tsx:186](src/components/ProductionBrief.tsx#L186) |
| 12 | `calculateFees(inputs)` returns line items + total | [feeCalculator.ts:123](src/lib/feeCalculator.ts#L123) |
| 13 | UI renders itemized ledger with animated total | [ProductionBrief.tsx:338+](src/components/ProductionBrief.tsx#L338) |
| 14 | PostHog tracks `fee_estimate_viewed` | [ProductionBrief.tsx:217](src/components/ProductionBrief.tsx#L217) |

**Key insight:** Steps 11–13 happen entirely in the browser in under a millisecond. The only network calls are the Mapbox geocode (step 2) and the CDTFA proxy (step 5) — both for resolving the location, not for computing fees.

---

## 8. Local development

Requires Node.js and npm (use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage versions).

```sh
# Clone
git clone https://github.com/gabbyquerales/analog-canvas-compass.git
cd analog-canvas-compass

# Install
npm install

# Run dev server
npm run dev

# Run fee calculator tests
npm test
```

The Mapbox token is currently hardcoded in [`src/lib/mapbox.ts`](src/lib/mapbox.ts) — for production, move this to an environment variable.

### Deploying via Lovable

This project syncs bidirectionally with [Lovable](https://lovable.dev). Local commits pushed to `main` show up in Lovable automatically. Lovable-made changes are committed back to this repo.

To deploy: open the Lovable project → Share → Publish.
