export type FieldType = 'boolean' | 'number' | 'date' | 'select' | 'multiselect' | 'text';

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  helpText?: string;
  options?: string[];
  section?: string;
}

export const FORM_FIELDS: Field[] = [
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
    helpText: 'Minimum 3 full business days from submission.',
  },
  {
    id: 'submissionDate',
    label: 'Submission date (today)',
    type: 'date',
    required: true,
    section: 'Project Basics',
  },
  {
    id: 'fillingOutsideBusinessHours',
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
    helpText: 'Maximum 3 for Low Impact.',
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
    helpText: 'KB is silent on gaps. We'll flag for FilmLA confirmation if yes.',
    options: ['Consecutive', 'Gaps between days'],
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
      'Residential (private home or garden)',
      'Street or alley (public)',
      'Park or green space',
      'Commercial storefront (closed)',
      'Interior business (open to public)',
      'School, college, university, church, hospital',
      'City-owned building or structure',
      'Rooftop',
      'Hotel',
      'Airport',
      'Basement',
      'Multistory apartment (4+ stories)',
      'High rise (75+ ft)',
      'Brush or natural area',
      'Harbor',
      'Helipad or helicopter landing site',
    ],
  },
  {
    id: 'isRecParkProperty',
    label: 'Is this Rec & Parks property?',
    type: 'boolean',
    required: false,
    section: 'Locations',
    helpText: 'City-owned but potentially exempt. We'll flag for FilmLA confirmation.',
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
    helpText: 'If unsure, you'll be prompted to self-assess.',
  },
  {
    id: 'hasLargeLightingAssessment',
    label: 'Does your setup require a crane, multiple HMIs >12kW, or a generator truck?',
    type: 'select',
    required: false,
    section: 'Equipment',
    options: ['Yes', 'No', 'Unsure'],
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
  {
    id: 'hasLandscapeAlteration',
    label: 'Alterations to landscape?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasSignRemoval',
    label: 'Removal or replacement of signs, benches, or fencing?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasDiggingDrilling',
    label: 'Digging, staking, or drilling into ground or structures?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasNailingBolting',
    label: 'Nailing or bolting into buildings, structures, or trees?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasHeavyEquipmentOnGrass',
    label: 'Vehicles or heavy equipment on grass?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
  {
    id: 'hasCranes',
    label: 'Condors, cranes, or jib arms?',
    type: 'boolean',
    required: true,
    section: 'Equipment',
  },
];
