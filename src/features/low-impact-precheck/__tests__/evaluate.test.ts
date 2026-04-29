import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { rankSuggestions } from '../suggest';
import { countBusinessDays } from '../businessDays';
import { heroSilverLake, tooManyLocations, droneDisqualifier, recParksAmbiguity } from '../scenarios';
import type { ShootInput } from '../types';

// ──────────────────────────────────────────────
// Seed scenario tests
// ──────────────────────────────────────────────

describe('evaluate — seed scenarios', () => {
  it('heroSilverLake → qualifies', () => {
    const result = evaluate(heroSilverLake);
    expect(result.state).toBe('qualifies');
    expect(result.blockers).toHaveLength(0);
    expect(result.reviewTriggers).toHaveLength(0);
  });

  it('tooManyLocations → doesNotQualify', () => {
    const result = evaluate(tooManyLocations);
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'threshold_locations')).toBe(true);
  });

  it('droneDisqualifier → doesNotQualify with aerial blocker', () => {
    const result = evaluate(droneDisqualifier);
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'act_aerial_activity')).toBe(true);
    // Single blocker — split-the-shoot suggestion should apply
    const suggestions = rankSuggestions(
      result.blockers.map((b) => b.id),
      result.reviewTriggers.map((r) => r.id),
    );
    expect(suggestions[0]?.tier).toBe(1);
    expect(suggestions[0]?.id).toBe('split_the_shoot');
  });

  it('recParksAmbiguity → needsReview (exemption suppresses city_buildings blocker)', () => {
    const result = evaluate(recParksAmbiguity);
    expect(result.state).toBe('needsReview');
    expect(result.blockers).toHaveLength(0);
    expect(result.reviewTriggers.some((r) => r.id === 'review_rec_parks_property')).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Jurisdiction gate
// ──────────────────────────────────────────────

describe('evaluate — jurisdiction gate', () => {
  const baseInput: ShootInput = {
    ...heroSilverLake,
    jurisdiction: 'other',
  };

  it('non-LA jurisdiction → notApplicable', () => {
    const result = evaluate(baseInput);
    expect(result.state).toBe('notApplicable');
    expect(result.blockers).toHaveLength(0);
  });

  it('unsure jurisdiction → notApplicable', () => {
    const result = evaluate({ ...baseInput, jurisdiction: 'unsure' });
    expect(result.state).toBe('notApplicable');
  });

  it('notApplicable jurisdiction → notApplicable', () => {
    const result = evaluate({ ...baseInput, jurisdiction: 'notApplicable' });
    expect(result.state).toBe('notApplicable');
  });

  it('cityOfLA jurisdiction → evaluates normally', () => {
    const result = evaluate({ ...baseInput, jurisdiction: 'cityOfLA' });
    expect(result.state).toBe('qualifies');
  });
});

// ──────────────────────────────────────────────
// Hours rule (Hazard 3 fix)
// ──────────────────────────────────────────────

describe('evaluate — hours rule', () => {
  it('filmingOutsideBusinessHours=true → blocker fires unconditionally', () => {
    const result = evaluate({
      ...heroSilverLake,
      filmingOutsideBusinessHours: true,
    });
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'hours_outside_standard')).toBe(true);
  });

  it('filmingOutsideBusinessHours=false → no hours blocker', () => {
    const result = evaluate({
      ...heroSilverLake,
      filmingOutsideBusinessHours: false,
    });
    expect(result.blockers.some((b) => b.id === 'hours_outside_standard')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Location enum (Hazard 1 fix)
// ──────────────────────────────────────────────

describe('evaluate — location types use IDs', () => {
  it('selecting rooftops → blocker fires', () => {
    const result = evaluate({
      ...heroSilverLake,
      locationTypes: ['rooftops'],
    });
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'loc_rooftops')).toBe(true);
  });

  it('selecting hotels → blocker fires', () => {
    const result = evaluate({
      ...heroSilverLake,
      locationTypes: ['hotels'],
    });
    expect(result.blockers.some((b) => b.id === 'loc_hotels')).toBe(true);
  });

  it('selecting schools → blocker fires', () => {
    const result = evaluate({
      ...heroSilverLake,
      locationTypes: ['schools'],
    });
    expect(result.blockers.some((b) => b.id === 'loc_schools')).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Rec & Parks exemption (Hazard 5 fix)
// ──────────────────────────────────────────────

describe('evaluate — Rec & Parks exemption', () => {
  it('city_buildings + isRecParkProperty=true → needsReview, NOT doesNotQualify', () => {
    const result = evaluate({
      ...heroSilverLake,
      locationTypes: ['city_buildings'],
      isRecParkProperty: true,
    });
    expect(result.state).toBe('needsReview');
    expect(result.blockers.some((b) => b.id === 'loc_city_buildings')).toBe(false);
    expect(result.reviewTriggers.some((r) => r.id === 'review_rec_parks_property')).toBe(true);
  });

  it('city_buildings WITHOUT isRecParkProperty → doesNotQualify', () => {
    const result = evaluate({
      ...heroSilverLake,
      locationTypes: ['city_buildings'],
      isRecParkProperty: false,
    });
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'loc_city_buildings')).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Business days (Hazard 4 fix)
// ──────────────────────────────────────────────

describe('countBusinessDays', () => {
  it('skips weekends', () => {
    // Friday May 1, 2026 → Monday May 4, 2026 = 1 business day (Mon)
    const from = new Date('2026-05-01'); // Friday
    const to = new Date('2026-05-04');   // Monday
    expect(countBusinessDays(from, to)).toBe(1);
  });

  it('counts weekdays correctly', () => {
    // Monday May 4 → Friday May 8 = 4 business days (Tue, Wed, Thu, Fri)
    const from = new Date('2026-05-04');
    const to = new Date('2026-05-08');
    expect(countBusinessDays(from, to)).toBe(4);
  });

  it('skips CA holidays (Memorial Day 2026 = May 25)', () => {
    // Friday May 22 → Tuesday May 26 = 1 business day (Tue)
    // May 23 (Sat), May 24 (Sun), May 25 (Mon = Memorial Day) all skipped
    const from = new Date('2026-05-22');
    const to = new Date('2026-05-26');
    expect(countBusinessDays(from, to)).toBe(1);
  });

  it('returns 0 when from equals to', () => {
    const d = new Date('2026-05-05');
    expect(countBusinessDays(d, d)).toBe(0);
  });
});

// ──────────────────────────────────────────────
// Suggestion ranking
// ──────────────────────────────────────────────

describe('rankSuggestions', () => {
  it('returns suggestions sorted by tier ascending', () => {
    const suggestions = rankSuggestions(
      ['act_aerial_activity', 'threshold_locations'],
      [],
    );
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].tier).toBeGreaterThanOrEqual(suggestions[i - 1].tier);
    }
  });

  it('split_the_shoot (tier 1) ranks above location_consolidation (tier 5)', () => {
    const suggestions = rankSuggestions(
      ['act_aerial_activity', 'threshold_locations'],
      [],
    );
    const splitIdx = suggestions.findIndex((s) => s.id === 'split_the_shoot');
    const consolidateIdx = suggestions.findIndex((s) => s.id === 'location_consolidation');
    expect(splitIdx).toBeLessThan(consolidateIdx);
  });
});
