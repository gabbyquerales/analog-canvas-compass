import type { Rule } from './types';

const KB_URL = 'https://info.filmla.com/general-information/low-impact-permit-pilot-program';
const ANNOUNCE_URL = 'https://www.filmla.com/now-accepting-applications-for-lower-cost-low-impact-permits-in-city-of-los-angeles/';

export const ACTIVITY_FLAGS: Rule[] = [
  {
    id: 'act_special_effects',
    label: 'No special effects requiring LAFD permit',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_gunfire',
    label: 'No gunfire or brandishing of weapons',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_officer_impersonation',
    label: 'No impersonating officers or emergency personnel',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_lane_closure',
    label: 'No lane or sidewalk closures',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_traffic_control',
    label: 'No traffic control or interference with the public right of way',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_driving_shots',
    label: 'No driving shots',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_aerial_activity',
    label: 'No aerial activity (UAS/drones, helicopters, planes)',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_animal_activity',
    label: 'No animal activity',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_amplified_music',
    label: 'No amplified music performance or playback',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_large_lighting',
    label: 'No large lighting set ups or cranes',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
    // HEURISTIC, not in FilmLA KB — "large lighting set ups" is qualitative,
    // no wattage threshold published. Present to user as rough self-assessment.
    helpText: 'Self-assess: Does your lighting setup require a crane, multiple HMIs >12kW, or a separate generator truck?',
  },
  {
    id: 'act_generators',
    label: 'No use of generators',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_open_flames',
    label: 'No open flames',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_propane_heaters',
    label: 'No use of propane heaters',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_smoke_machines',
    label: 'No smoke machines',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_alarm_bypass',
    label: 'No causing building alarm systems to be in test mode or bypassed',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_smoking',
    label: 'No smoking',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_practical_stove',
    label: 'No use of a practical stove, fireplace, grill, or any appliance requiring LAFD 315 permit',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_grilling_food_prep',
    label: 'No grilling or food prep requiring heat sources',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_stunts',
    label: 'No stunts',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_landscape_alteration',
    label: 'No alterations to landscape',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_sign_removal',
    label: 'No removal or replacement of signs, park benches, or fencing',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_digging_drilling',
    label: 'No digging, staking, or drilling into turf, rocks, trees, or asphalt',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_nailing_bolting',
    label: 'No nailing or bolting into buildings, structures, or trees',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_heavy_equipment_grass',
    label: 'No vehicles or heavy equipment on grass',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'act_cranes_jibs',
    label: 'No condors, cranes, or jib arms',
    category: 'activity',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
];

export const LOCATION_FLAGS: Rule[] = [
  {
    id: 'loc_schools',
    label: 'Schools, colleges, universities, churches, or hospitals (LAFD walkthroughs required)',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_city_buildings',
    label: 'City-owned buildings or structures (Rec & Parks property exempt — see needs-review)',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_neighborhood_conditions',
    label: 'Areas covered by Neighborhood Special Filming Conditions',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_rooftops',
    label: 'Rooftops',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_hotels',
    label: 'Hotels',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_interior_business',
    label: 'Interior business locations open to the public',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_airports',
    label: 'Airports',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_basements',
    label: 'Basements',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_multistory_apartments',
    label: 'Multistory apartments (4+ stories)',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_high_rises',
    label: 'High rises (75+ ft)',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_brush',
    label: 'Brush',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_harbor',
    label: 'Harbor',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
  {
    id: 'loc_helipads',
    label: 'Helipads or helicopter landings',
    category: 'location',
    disqualifier: true,
    sourceUrl: KB_URL,
  },
];

export const REVIEW_TRIGGERS: Rule[] = [
  {
    id: 'review_non_consecutive_days',
    label: 'Non-consecutive filming days (gaps between days)',
    category: 'review',
    disqualifier: false,
    sourceUrl: KB_URL,
    helpText: 'KB is silent on gaps. Please verify with FilmLA whether breaks between filming days affect Low Impact eligibility.',
  },
  {
    id: 'review_large_lighting_self_assess',
    label: 'Large lighting set ups (requires self-assessment)',
    category: 'review',
    disqualifier: false,
    sourceUrl: KB_URL,
    helpText: 'Qualitative only — no wattage threshold. Self-assess: Does your setup require a crane, multiple HMIs >12kW, or a separate generator truck?',
  },
  {
    id: 'review_rec_parks_property',
    label: 'Rec & Parks property (city-owned but potentially exempt)',
    category: 'review',
    disqualifier: false,
    sourceUrl: KB_URL,
    helpText: 'Rec & Parks property is noted as exempt in the pilot rules. Verify directly with FilmLA for your specific location.',
  },
];

export const THRESHOLDS = {
  maxLocations: 3,
  maxConsecutiveDays: 3,
  maxOnSetCount: 30,
};

export const DEADLINES = {
  minBusinessDays: 3,
  maxMonthsAhead: 1,
  // SOURCE AMBIGUITY: FilmLA says "up to six months" from Apr 27, 2026.
  // Oct 27 (exact) and Oct 31 (end-of-month) are both defensible.
  // Using Oct 31 as conservative upper bound.
  sunsetISO: '2026-10-31',
};

export const HOURS = {
  weekday: { start: 7, end: 22 },
  weekend: { start: 9, end: 22 },
};

export const FEE_MATH = {
  lowImpact: {
    application: 350,
    notificationPerLocation: 156,
    lafdSpotCheck: 0,
  },
  standard: {
    application: 931,
    notificationPerLocation: 232,
    lafdSpotCheck: 287,
  },
  savingsHeadline: 'up to 58 percent less',
  savingsCitation: ANNOUNCE_URL,
};
