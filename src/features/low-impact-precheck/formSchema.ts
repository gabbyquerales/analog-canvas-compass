export type FieldType = 'boolean' | 'number' | 'date' | 'select' | 'multiselect' | 'text';

export interface FieldOption {
  value: string;
  label: string;
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  helpText?: string;
  options?: FieldOption[];
  section?: string;
  visibleWhen?: { fieldId: string; equals?: any; includes?: string; includesAny?: string[] };
}

export const FORM_FIELDS: Field[] = [
  // Jurisdiction Gate
  {
    id: 'jurisdiction',
    label: 'Where is your shoot?',
    type: 'select',
    required: true,
    section: 'Jurisdiction',
    helpText: 'The Low Impact Pilot is City of Los Angeles only.',
    options: [
      { value: 'cityOfLA', label: 'City of Los Angeles' },
      { value: 'other', label: 'Other jurisdiction (Santa Monica, Burbank, LA County, etc.)' },
      { value: 'unsure', label: 'Not sure' },
      { value: 'notApplicable', label: 'Not applicable' },
    ],
  },

  // Project Basics
  {
    id: 'projectName',
    label: 'Project name',
    type: 'text',
    required: true,
    section: 'Project Basics',
  },
  {
    id: 'firstFilmingDate',
    label: 'First filming date',
    type: 'date',
    required: true,
    section: 'Project Basics',
    helpText: 'Minimum 3 full business days from submission (submit by 10am; weekends and CA holidays don\'t count).',
  },
  {
    id: 'submissionDate',
    label: 'Submission date (today)',
    type: 'date',
    required: true,
    section: 'Project Basics',
  },
  {
    id: 'filmingOutsideBusinessHours',
    label: 'Filming outside standard hours?',
    type: 'boolean',
    required: false,
    section: 'Project Basics',
    helpText: 'Standard: 7am–10pm weekdays, 9am–10pm weekends.',
  },

  // Schedule
  {
    id: 'locationCount',
    label: 'How many filming locations?',
    type: 'number',
    required: true,
    section: 'Schedule',
    helpText: 'Count filming locations only — cast/crew parking and base camp locations are free and don\'t count. Maximum 3 for Low Impact.',
  },
  {
    id: 'consecutiveFilmingDays',
    label: 'Consecutive filming days (longest stretch)',
    type: 'number',
    required: true,
    section: 'Schedule',
    helpText: 'E.g., Mon–Tue–Wed = 3 days. Maximum 3 for Low Impact.',
  },
  {
    id: 'isConsecutiveDays',
    label: 'Are all your filming days consecutive, or are there gaps?',
    type: 'select',
    required: true,
    section: 'Schedule',
    helpText: 'KB is silent on gaps. We\'ll flag for FilmLA confirmation if yes.',
    options: [
      { value: 'true', label: 'Consecutive' },
      { value: 'false', label: 'Gaps between days' },
    ],
  },
  {
    id: 'onSetCount',
    label: 'Maximum on-set crew count (any single day)',
    type: 'number',
    required: true,
    section: 'Schedule',
    helpText: 'Total cast & crew physically on set. Maximum 30 for Low Impact.',
  },

  // Locations
  {
    id: 'locationTypes',
    label: 'Location types',
    type: 'multiselect',
    required: true,
    section: 'Locations',
    helpText: 'Select all that apply.',
    options: [
      { value: 'residential', label: 'Residential (private home or garden)' },
      { value: 'street', label: 'Street or alley (public)' },
      { value: 'park', label: 'Park or green space' },
      { value: 'commercial_closed', label: 'Commercial storefront (closed)' },
      { value: 'interior_business', label: 'Interior business (open to public)' },
      { value: 'schools', label: 'School, college, university, church, hospital' },
      { value: 'city_buildings', label: 'City-owned building or structure' },
      { value: 'rooftops', label: 'Rooftop' },
      { value: 'hotels', label: 'Hotel' },
      { value: 'airports', label: 'Airport' },
      { value: 'basements', label: 'Basement' },
      { value: 'multistory_apartments', label: 'Multistory apartment (4+ stories)' },
      { value: 'high_rises', label: 'High rise (75+ ft)' },
      { value: 'brush', label: 'Brush or natural area' },
      { value: 'harbor', label: 'Harbor' },
      { value: 'helipads', label: 'Helipad or helicopter landing site' },
    ],
  },
  {
    id: 'isRecParkProperty',
    label: 'Is this Rec & Parks property?',
    type: 'boolean',
    required: false,
    section: 'Locations',
    helpText: 'Rec & Parks property has extra restrictions (and city-owned buildings on it are potentially exempt). We\'ll flag for FilmLA confirmation.',
    // Parks are the typical Rec & Parks case — this must show for them too,
    // since the six Rec & Parks-scoped questions below are gated on it (F1).
    visibleWhen: { fieldId: 'locationTypes', includesAny: ['city_buildings', 'park'] },
  },

  // Activities
  {
    id: 'hasSpecialEffects',
    label: 'Special effects (requiring LAFD permit)?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasGunfire',
    label: 'Gunfire or brandishing of weapons?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasOfficerImpersonation',
    label: 'Impersonating officers or emergency personnel?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasLaneClosures',
    label: 'Lane or sidewalk closures?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasTrafficControl',
    label: 'Traffic control or interference with public right of way?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasDrivingShots',
    label: 'Driving shots?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasAerialActivity',
    label: 'Aerial activity (drones, helicopters, planes)?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasAnimalActivity',
    label: 'Animal activity?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasAmplifiedMusic',
    label: 'Amplified music performance or playback?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },
  {
    id: 'hasStunts',
    label: 'Stunts?',
    type: 'boolean',
    required: true,
    section: 'Activities',
  },

  // Equipment
  {
    id: 'hasLargeLighting',
    label: 'Large lighting setups?',
    type: 'boolean',
    required: false,
    section: 'Equipment',
    helpText: 'If unsure, you\'ll be prompted to self-assess.',
  },
  {
    id: 'hasLargeLightingAssessment',
    label: 'Does your setup require a crane, multiple HMIs >12kW, or a generator truck?',
    type: 'select',
    required: false,
    section: 'Equipment',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'unsure', label: 'Unsure' },
    ],
    visibleWhen: { fieldId: 'hasLargeLighting', equals: true },
  },
  {
    id: 'hasGenerators',
    label: 'Generators (including battery packs over 25kW)?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasSmokeMachines',
    label: 'Smoke machines?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasOpenFlames',
    label: 'Open flames?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasPropaneHeaters',
    label: 'Propane heaters?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasPracticalStove',
    label: 'Practical stove, fireplace, grill, or appliance requiring LAFD 315 permit?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasGrillingFoodPrep',
    label: 'Grilling or food prep requiring heat sources?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasSmoking',
    label: 'Smoking?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasAlarmBypass',
    label: 'Building alarm systems in test mode or bypassed?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  // F1 fix: the six Rec & Parks-scoped prohibitions (FilmLA "Limits Applying to
  // Recreation & Parks Locations") are asked as one multiselect, only when
  // isRecParkProperty is true. Values are rule IDs (same pattern as locationTypes);
  // evaluate.ts gates on isRecParkProperty the same way. Empty selection = none apply.
  {
    id: 'recParksActivities',
    label: 'Will you do any of the following at the Rec & Parks location?',
    type: 'multiselect',
    required: false,
    section: 'Equipment',
    helpText: 'Select all that apply — these are prohibited at Rec & Parks locations under Low Impact. Leave empty if none apply.',
    visibleWhen: { fieldId: 'isRecParkProperty', equals: true },
    options: [
      { value: 'act_landscape_alteration', label: 'Alterations to landscape' },
      { value: 'act_sign_removal', label: 'Removal or replacement of signs, benches, or fencing' },
      { value: 'act_digging_drilling', label: 'Digging, staking, or drilling into ground or structures' },
      { value: 'act_nailing_bolting', label: 'Nailing or bolting into buildings, structures, or trees' },
      { value: 'act_heavy_equipment_grass', label: 'Vehicles or heavy equipment on grass' },
      { value: 'act_cranes_jibs', label: 'Condors, cranes, or jib arms' },
    ],
  },
];
