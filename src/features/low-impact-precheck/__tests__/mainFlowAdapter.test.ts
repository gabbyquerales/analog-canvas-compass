import { describe, it, expect } from 'vitest';
import {
  MAIN_FLOW_ACTIVITY_TO_FLAG,
  ADDITIONAL_ACTIVITY_OPTIONS,
  buildPartialRulesInput,
  detectLowImpactPotential,
  evaluateWithConfirm,
  type LowImpactConfirmInputs,
} from '../mainFlowAdapter';
import { ACTIVITY_FLAGS, REC_PARKS_SCOPED_ACTIVITY_IDS } from '../rules';
import { DEFAULT_INPUTS, type ShootInputs } from '@/lib/feeCalculator';

const TODAY = '2026-07-23';

const laBase: ShootInputs = {
  ...DEFAULT_INPUTS,
  jurisdictionSlug: 'los-angeles',
  shootDays: 2,
  crewSize: 18,
  numberOfLocations: 2,
};

const cleanConfirm: LowImpactConfirmInputs = {
  firstFilmingDate: '2026-08-05',
  onSetCount: 22,
  locationTypes: ['residential'],
  isRecParkProperty: false,
  recParksActivities: [],
  filmingOutsideBusinessHours: false,
  additionalActivities: [],
};

// ──────────────────────────────────────────────
// Mapping
// ──────────────────────────────────────────────

describe('mainFlowAdapter — activity mapping', () => {
  it('maps every main-flow activity id (activities.json ids = slugs)', () => {
    // All 8 main-flow activities have an explicit entry (mapped or deliberately null)
    expect(Object.keys(MAIN_FLOW_ACTIVITY_TO_FLAG).sort()).toEqual([
      'animals', 'drone_aerial', 'gunfire_sfx', 'night_shoot',
      'pyrotechnics', 'street_closure', 'stunts', 'water_effects',
    ]);
  });

  it('mapped flags are set on the partial input', () => {
    const input = buildPartialRulesInput(
      { ...laBase, selectedActivities: ['drone_aerial', 'stunts', 'gunfire_sfx', 'pyrotechnics', 'street_closure', 'animals'] },
      TODAY,
    );
    expect(input.hasAerialActivity).toBe(true);
    expect(input.hasStunts).toBe(true);
    expect(input.hasGunfire).toBe(true);
    expect(input.hasSpecialEffects).toBe(true);
    expect(input.hasLaneClosures).toBe(true);
    expect(input.hasAnimalActivity).toBe(true);
  });

  it('night_shoot and water_effects deliberately set no flag', () => {
    const input = buildPartialRulesInput(
      { ...laBase, selectedActivities: ['night_shoot', 'water_effects'] },
      TODAY,
    );
    expect(input.filmingOutsideBusinessHours).toBeUndefined();
    const anyFlagSet = Object.entries(input).some(([k, v]) => k.startsWith('has') && v === true);
    expect(anyFlagSet).toBe(false);
  });

  it('every ADDITIONAL_ACTIVITY_OPTIONS value is a real rule id', () => {
    const ruleIds = new Set(ACTIVITY_FLAGS.map((r) => r.id));
    for (const opt of ADDITIONAL_ACTIVITY_OPTIONS) {
      expect(ruleIds.has(opt.value), `unknown rule id ${opt.value}`).toBe(true);
    }
  });

  it('additional options do not overlap the Rec & Parks-scoped multiselect', () => {
    for (const opt of ADDITIONAL_ACTIVITY_OPTIONS) {
      expect(REC_PARKS_SCOPED_ACTIVITY_IDS).not.toContain(opt.value);
    }
  });

  it('parks location maps to Rec & Parks property + park location type', () => {
    const input = buildPartialRulesInput({ ...laBase, isParksLocation: true }, TODAY);
    expect(input.isRecParkProperty).toBe(true);
    expect(input.locationTypes).toContain('park');
  });
});

// ──────────────────────────────────────────────
// Detection: definitive no, never unconditional yes
// ──────────────────────────────────────────────

describe('mainFlowAdapter — detectLowImpactPotential', () => {
  it('clean small LA motion shoot → potential', () => {
    const { potential, definitiveBlockers } = detectLowImpactPotential(laBase, TODAY);
    expect(potential).toBe(true);
    expect(definitiveBlockers).toHaveLength(0);
  });

  it('non-LA jurisdiction → no potential', () => {
    expect(detectLowImpactPotential({ ...laBase, jurisdictionSlug: 'culver-city' }, TODAY).potential).toBe(false);
  });

  it('student, non-profit, and still-photo shoots → no banner (cheaper tiers exist)', () => {
    expect(detectLowImpactPotential({ ...laBase, isStudent: true }, TODAY).potential).toBe(false);
    expect(detectLowImpactPotential({ ...laBase, isNonProfit: true }, TODAY).potential).toBe(false);
    expect(detectLowImpactPotential({ ...laBase, isMotion: false }, TODAY).potential).toBe(false);
  });

  it('>3 locations → definitive no with threshold blocker', () => {
    const r = detectLowImpactPotential({ ...laBase, numberOfLocations: 4 }, TODAY);
    expect(r.potential).toBe(false);
    expect(r.definitiveBlockers.some((b) => b.id === 'threshold_locations')).toBe(true);
  });

  it('>30 crew → definitive no', () => {
    expect(detectLowImpactPotential({ ...laBase, crewSize: 31 }, TODAY).potential).toBe(false);
  });

  it('>3 days → definitive no (Days treated as consecutive)', () => {
    expect(detectLowImpactPotential({ ...laBase, shootDays: 4 }, TODAY).potential).toBe(false);
  });

  it('drone day → definitive no', () => {
    const r = detectLowImpactPotential({ ...laBase, selectedActivities: ['drone_aerial'] }, TODAY);
    expect(r.potential).toBe(false);
    expect(r.definitiveBlockers.some((b) => b.id === 'act_aerial_activity')).toBe(true);
  });

  it('night shoot alone does NOT rule it out (hours asked in confirm step)', () => {
    expect(detectLowImpactPotential({ ...laBase, selectedActivities: ['night_shoot'] }, TODAY).potential).toBe(true);
  });

  it('parks location alone does NOT rule it out (review trigger, not blocker)', () => {
    expect(detectLowImpactPotential({ ...laBase, isParksLocation: true }, TODAY).potential).toBe(true);
  });

  it('detection never claims qualification — it only reports potential', () => {
    // Type-level guarantee is the LowImpactPotential shape; assert no state field leaks
    const r = detectLowImpactPotential(laBase, TODAY) as any;
    expect(r.state).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Full evaluation with confirm answers
// ──────────────────────────────────────────────

describe('mainFlowAdapter — evaluateWithConfirm', () => {
  it('clean shoot + clean confirm → qualifies', () => {
    const result = evaluateWithConfirm(laBase, cleanConfirm, TODAY);
    expect(result.state).toBe('qualifies');
    expect(result.blockers).toHaveLength(0);
  });

  it('confirm on-set total overrides the brief crew count (cast pushes past 30)', () => {
    // 20 crew passes detection, but 20 crew + 15 cast = 35 on set must fail
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, onSetCount: 35 }, TODAY);
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'threshold_on_set')).toBe(true);
  });

  it('confirm can produce a definitive no (hotel location)', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, locationTypes: ['hotels'] }, TODAY);
    expect(result.state).toBe('doesNotQualify');
    expect(result.blockers.some((b) => b.id === 'loc_hotels')).toBe(true);
  });

  it('confirm hours answer becomes the hours blocker', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, filmingOutsideBusinessHours: true }, TODAY);
    expect(result.blockers.some((b) => b.id === 'hours_outside_standard')).toBe(true);
  });

  it('additional activities map to their flags (generators)', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, additionalActivities: ['act_generators'] }, TODAY);
    expect(result.blockers.some((b) => b.id === 'act_generators')).toBe(true);
  });

  it('large lighting selection carries the yes self-assessment', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, additionalActivities: ['act_large_lighting'] }, TODAY);
    expect(result.blockers.some((b) => b.id === 'act_large_lighting')).toBe(true);
  });

  it('main-flow parks signal wins even if confirm says not Rec & Parks', () => {
    const result = evaluateWithConfirm(
      { ...laBase, isParksLocation: true },
      { ...cleanConfirm, isRecParkProperty: false, recParksActivities: ['act_cranes_jibs'] },
      TODAY,
    );
    expect(result.blockers.some((b) => b.id === 'act_cranes_jibs')).toBe(true);
  });

  it('rec parks activities ignored when not Rec & Parks property', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, recParksActivities: ['act_cranes_jibs'] }, TODAY);
    expect(result.blockers).toHaveLength(0);
  });

  it('real dates drive deadline rules: filming tomorrow → insufficient notice', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, firstFilmingDate: '2026-07-24' }, TODAY);
    expect(result.blockers.some((b) => b.id === 'deadline_insufficient_notice')).toBe(true);
  });

  it('real dates drive timing notice: filming >1 month out', () => {
    const result = evaluateWithConfirm(laBase, { ...cleanConfirm, firstFilmingDate: '2026-09-20' }, TODAY);
    expect(result.state).toBe('qualifies');
    expect(result.timingNotices.some((t) => t.id === 'deadline_too_early')).toBe(true);
  });
});
