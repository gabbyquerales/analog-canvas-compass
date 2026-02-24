// Jurisdiction resolver for film permits
// Queries Supabase for jurisdiction data and special condition areas

import { supabase } from "@/integrations/supabase/client";

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

  // Check context array for neighborhood or locality type
  const context = mapboxFeature.context ?? [];
  for (const ctx of context) {
    if (ctx.id?.startsWith("neighborhood.") || ctx.id?.startsWith("locality.")) {
      return ctx.text ?? null;
    }
  }

  // If the feature itself is a POI or neighborhood, use its text
  const placeType = mapboxFeature.place_type?.[0];
  if (placeType === "poi" || placeType === "neighborhood") {
    return mapboxFeature.text ?? null;
  }

  return null;
}

/**
 * Thread A: Query the jurisdictions table using the normalized CDTFA name.
 * Returns the full jurisdiction row including the id (Master Key).
 */
async function lookupJurisdiction(cdtfaName: string): Promise<JurisdictionResult | null> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("*")
    .eq("cdtfa_name", cdtfaName)
    .maybeSingle();

  if (error || !data) return null;

  return {
    jurisdictionId: data.id,
    jurisdiction: data.name,
    permitAuthority: data.permit_authority ?? "Unknown",
    notes: data.special_notes ?? "",
    estimatedFee: (data.base_application_fee ?? 0) + (data.mandatory_review_fees ?? 0),
    deadlineTime: `${data.min_lead_days_standard ?? 3}-day`,
    cdtfaName: data.cdtfa_name,
    microShootEligible: data.micro_shoot_eligible ?? false,
    microShootMaxCrew: data.micro_shoot_max_crew,
    standardFilmingHours: data.standard_filming_hours,
    regionalProfile: (data as any).regional_profile ?? null,
    defaultStaffingRate: (data as any).default_staffing_rate ?? null,
  };
}

/**
 * Thread B & C: Query special_condition_areas using the Master Key (jurisdiction_id)
 * and an optional neighborhood/landmark name for fuzzy matching.
 */
async function lookupSpecialCondition(
  jurisdictionId: string,
  neighborhood: string | null,
  landmarkName: string | null
): Promise<SpecialConditionResult | null> {
  // Try landmark name first (Thread C), then neighborhood (Thread B)
  const searchTerms = [landmarkName, neighborhood].filter(Boolean) as string[];

  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from("special_condition_areas")
      .select("*")
      .eq("jurisdiction_id", jurisdictionId)
      .ilike("area_name", `%${term}%`)
      .maybeSingle();

    if (!error && data) {
      return {
        areaName: data.area_name,
        restrictionSummary: data.restriction_summary,
        difficultyScore: data.difficulty_score,
        filmLaPdfLink: data.filmla_pdf_link,
      };
    }
  }

  return null;
}

/**
 * Multi-threaded relational lookup:
 * Thread A: jurisdiction by cdtfa_name
 * Thread B/C: special_condition_areas by neighborhood/landmark + jurisdiction_id
 */
export async function performRelationalLookup(
  cdtfaName: string,
  mapboxFeature: any
): Promise<LookupResult> {
  // Thread A: Get the jurisdiction (Master Key)
  const jurisdiction = await lookupJurisdiction(cdtfaName);

  if (!jurisdiction) {
    return { jurisdiction: null, neighborhood: null, specialCondition: null };
  }

  // Extract neighborhood and landmark from Mapbox
  const neighborhood = extractNeighborhood(mapboxFeature);
  const landmarkName = mapboxFeature?.place_type?.[0] === "poi" ? mapboxFeature.text : null;

  // Thread B & C: Query special conditions using the Master Key
  const specialCondition = await lookupSpecialCondition(
    jurisdiction.jurisdictionId,
    neighborhood,
    landmarkName
  );

  return { jurisdiction, neighborhood, specialCondition };
}

/**
 * Legacy: match by cdtfa name without Supabase (kept for fallback/compatibility).
 */
export function matchJurisdictionByCdtfa(cdtfaName: string): null {
  // Deprecated — use performRelationalLookup instead
  return null;
}
