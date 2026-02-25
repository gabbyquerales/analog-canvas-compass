// Jurisdiction resolver for film permits
// Uses static JSON data via feeCalculator helpers

import { getJurisdictionBycdtfaName } from "@/lib/feeCalculator";

export interface JurisdictionResult {
  jurisdictionId: string;
  jurisdiction: string;
  permitAuthority: string;
  notes: string;
  estimatedFee: number;
  deadlineTime: string;
  cdtfaName: string;
  microShootEligible: boolean;
  microShootMaxCrew: number | null;
  standardFilmingHours: string | null;
  regionalProfile: string | null;
  defaultStaffingRate: number | null;
}

export interface SpecialConditionResult {
  areaName: string;
  restrictionSummary: string | null;
  difficultyScore: number | null;
  filmLaPdfLink: string | null;
}

export interface LookupResult {
  jurisdiction: JurisdictionResult | null;
  neighborhood: string | null;
  specialCondition: SpecialConditionResult | null;
}

/**
 * Extract neighborhood or POI name from Mapbox feature context.
 */
export function extractNeighborhood(mapboxFeature: any): string | null {
  if (!mapboxFeature) return null;

  const context = mapboxFeature.context ?? [];
  for (const ctx of context) {
    if (ctx.id?.startsWith("neighborhood.") || ctx.id?.startsWith("locality.")) {
      return ctx.text ?? null;
    }
  }

  const placeType = mapboxFeature.place_type?.[0];
  if (placeType === "poi" || placeType === "neighborhood") {
    return mapboxFeature.text ?? null;
  }

  return null;
}

/**
 * Thread A: Look up jurisdiction from static JSON using the normalized CDTFA name.
 */
function lookupJurisdiction(cdtfaName: string): JurisdictionResult | null {
  const j = getJurisdictionBycdtfaName(cdtfaName);
  if (!j) return null;

  return {
    jurisdictionId: j.slug,
    jurisdiction: j.name,
    permitAuthority: j.permitAuthority ?? "Unknown",
    notes: (j as any).specialNotes ?? "",
    estimatedFee: 0, // Now computed by calculateFees()
    deadlineTime: `${j.minLeadDaysStandard ?? 3}-day`,
    cdtfaName: j.cdtfaName,
    microShootEligible: j.microShootEligible ?? false,
    microShootMaxCrew: j.microShootMaxCrew ?? null,
    standardFilmingHours: j.standardFilmingHours ?? null,
    regionalProfile: (j as any).regionalProfile ?? null,
    defaultStaffingRate: (j as any).defaultStaffingRate ?? null,
  };
}

/**
 * Thread B & C: Special condition lookup.
 * Returns null — special condition areas aren't in the static JSON yet.
 */
function lookupSpecialCondition(
  _jurisdictionId: string,
  _neighborhood: string | null,
  _landmarkName: string | null
): SpecialConditionResult | null {
  return null;
}

/**
 * Multi-threaded relational lookup:
 * Thread A: jurisdiction by cdtfa_name (static JSON)
 * Thread B/C: special_condition_areas (stub — returns null)
 */
export async function performRelationalLookup(
  cdtfaName: string,
  mapboxFeature: any
): Promise<LookupResult> {
  const jurisdiction = lookupJurisdiction(cdtfaName);

  if (!jurisdiction) {
    return { jurisdiction: null, neighborhood: null, specialCondition: null };
  }

  const neighborhood = extractNeighborhood(mapboxFeature);
  const landmarkName = mapboxFeature?.place_type?.[0] === "poi" ? mapboxFeature.text : null;

  const specialCondition = lookupSpecialCondition(
    jurisdiction.jurisdictionId,
    neighborhood,
    landmarkName
  );

  return { jurisdiction, neighborhood, specialCondition };
}
