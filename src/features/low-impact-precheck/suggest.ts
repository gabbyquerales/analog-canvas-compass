import type { Suggestion } from './types';

export const SUGGESTIONS: Record<string, Suggestion> = {
  split_the_shoot: {
    id: 'split_the_shoot',
    tier: 1,
    headline: 'Split the shoot across two permits',
    body: 'Move your single blocker activity (e.g., drone day, special effects sequence, stunt) to a separate Standard Tier filing. This lets you file the rest under Low Impact, preserving the lower fee and faster review for the bulk of your shoot. Total employment impact: zero.',
    appliesTo: [
      'act_aerial_activity',
      'act_special_effects',
      'act_stunts',
      'act_driving_shots',
      'act_large_lighting',
      'act_amplified_music',
    ],
  },

  timing_fixes: {
    id: 'timing_fixes',
    tier: 2,
    headline: 'Adjust your submission or shoot timeline',
    body: 'File at least 3 full business days before your first filming day. If you were planning to submit more than 1 month ahead, shift your first filming date within 30 days of submission. Standard hours: 7am–10pm weekdays, 9am–10pm weekends.',
    appliesTo: [
      'deadline_insufficient_notice',
      'deadline_too_early',
      'hours_outside_standard',
    ],
  },

  activity_isolation: {
    id: 'activity_isolation',
    tier: 3,
    headline: 'Isolate high-impact activities',
    body: 'Move generators, smoke machines, pyrotechnics, or other permit-triggering activities to a separate day filed under Standard Tier. Keep your lower on-location footprint days in Low Impact. No change to total employment.',
    appliesTo: [
      'act_generators',
      'act_smoke_machines',
      'act_propane_heaters',
      'act_open_flames',
      'act_practical_stove',
      'act_grilling_food_prep',
    ],
  },

  footprint_orchestration: {
    id: 'footprint_orchestration',
    tier: 4,
    headline: 'Lower your on-location footprint',
    body: 'Stagger call times, move support (catering, parking, wardrobe) off-site, or separate prep and holding from the active set. This reduces community impact without changing total employment. Works for threshold blockers (crew count, vehicle traffic).',
    appliesTo: [
      'threshold_on_set',
      'act_heavy_equipment_grass',
      'act_nailing_bolting',
      'act_digging_drilling',
      'act_landscape_alteration',
    ],
  },

  location_consolidation: {
    id: 'location_consolidation',
    tier: 5,
    headline: 'Repackage locations creatively',
    body: 'Can one location play multiple scenes? Doubling locations (e.g., a single street for two dialogue beats) drops your location count and may qualify you. Review the script with production design.',
    appliesTo: ['threshold_locations'],
  },

  rec_parks_verify: {
    id: 'rec_parks_verify',
    tier: 2,
    headline: 'Verify Rec & Parks eligibility directly with FilmLA',
    body: "Rec & Parks property is noted as exempt in the pilot rules, but confirm your specific location with FilmLA before filing. Email permitting@filmla.com with your site address and they'll clarify.",
    appliesTo: ['review_rec_parks_property'],
  },

  large_lighting_assess: {
    id: 'large_lighting_assess',
    tier: 3,
    headline: 'Reassess your lighting setup',
    body: 'Does your rig require a crane, multiple HMIs over 12kW, or a separate generator truck? If yes, move that day to Standard Tier. If no (practical lights, LED panels, available light), you likely qualify — submit with a photo of your setup.',
    appliesTo: ['review_large_lighting_self_assess'],
  },

  non_consecutive_verify: {
    id: 'non_consecutive_verify',
    tier: 2,
    headline: 'Clarify gap rules with FilmLA',
    body: 'The KB does not specify whether gaps between filming days (e.g., Monday & Wednesday, with Tuesday off) affect Low Impact eligibility. File 3+ consecutive days; if you have gaps, contact FilmLA at permitting@filmla.com to confirm your eligibility before submitting.',
    appliesTo: ['review_non_consecutive_days'],
  },
};

export function rankSuggestions(
  blockers: string[],
  reviewTriggers: string[]
): Suggestion[] {
  const allTriggerIds = [...blockers, ...reviewTriggers];

  const matched = Object.values(SUGGESTIONS).filter((s) =>
    s.appliesTo.some((id) => allTriggerIds.includes(id))
  );

  return matched.sort((a, b) => a.tier - b.tier);
}
