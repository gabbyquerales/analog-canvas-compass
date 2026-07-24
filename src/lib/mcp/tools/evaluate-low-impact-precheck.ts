import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { evaluate } from "../../../features/low-impact-precheck/evaluate";
import type { ShootInput } from "../../../features/low-impact-precheck/types";

export default defineTool({
  name: "evaluate_low_impact_precheck",
  title: "Evaluate FilmLA Low Impact Pre-Check",
  description:
    "Run KAIRO's deterministic FilmLA Low Impact Permit Pilot Program pre-check. Given a planned City of Los Angeles shoot, returns whether it likely qualifies (qualifies / needsReview / doesNotQualify / notApplicable), all disqualifying blockers, review triggers, timing notices, and a Low-Impact vs Standard fee comparison. Sourced from the FilmLA KB — this is an estimate, not a permit approval.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    firstFilmingDate: z
      .string()
      .describe("First filming day, ISO date (YYYY-MM-DD)."),
    submissionDate: z
      .string()
      .optional()
      .describe("Application submission date, ISO date (YYYY-MM-DD). Defaults to today."),
    jurisdiction: z
      .enum(["cityOfLA", "other", "unsure", "notApplicable"])
      .optional()
      .describe("Shoot jurisdiction. Low Impact only applies to City of LA."),
    locationCount: z.number().int().min(1).describe("Number of filming locations (parking/base camp don't count)."),
    consecutiveFilmingDays: z.number().int().min(1).describe("Consecutive filming days."),
    isConsecutiveDays: z.boolean().optional().describe("Whether the filming days are consecutive."),
    onSetCount: z.number().int().min(1).describe("Total cast & crew physically on set."),
    filmingOutsideBusinessHours: z
      .boolean()
      .optional()
      .describe("True if any filming happens outside 7am–10pm weekdays or 9am–10pm weekends."),
    hasSpecialEffects: z.boolean().optional(),
    hasGunfire: z.boolean().optional(),
    hasOfficerImpersonation: z.boolean().optional(),
    hasLaneClosures: z.boolean().optional(),
    hasTrafficControl: z.boolean().optional(),
    hasDrivingShots: z.boolean().optional(),
    hasAerialActivity: z.boolean().optional().describe("Drones, helicopters, planes."),
    hasAnimalActivity: z.boolean().optional(),
    hasAmplifiedMusic: z.boolean().optional(),
    hasLargeLighting: z.boolean().optional(),
    hasLargeLightingAssessment: z
      .enum(["yes", "no", "unsure"])
      .optional()
      .describe("Self-assessment when hasLargeLighting is true."),
    hasGenerators: z.boolean().optional(),
    hasOpenFlames: z.boolean().optional(),
    hasPropaneHeaters: z.boolean().optional(),
    hasSmokeMachines: z.boolean().optional(),
    hasAlarmBypass: z.boolean().optional(),
    hasSmoking: z.boolean().optional(),
    hasPracticalStove: z.boolean().optional(),
    hasGrillingFoodPrep: z.boolean().optional(),
    hasStunts: z.boolean().optional(),
    locationTypes: z
      .array(z.string())
      .optional()
      .describe(
        "Prohibited location type IDs present at the shoot. Any of: schools, city_buildings, neighborhood_conditions, rooftops, hotels, interior_business, airports, basements, multistory_apartments, high_rises, brush, harbor, helipads.",
      ),
    isRecParkProperty: z
      .boolean()
      .optional()
      .describe("True if any location is on LA Rec & Parks property."),
    recParksActivities: z
      .array(z.string())
      .optional()
      .describe("Rec & Parks-scoped activity rule IDs, only evaluated when isRecParkProperty is true."),
    projectName: z.string().optional().describe("Optional project label; not used in evaluation."),
  },
  handler: (input) => {
    const shoot: ShootInput = {
      projectName: input.projectName ?? "",
      jurisdiction: input.jurisdiction ?? "cityOfLA",
      firstFilmingDate: input.firstFilmingDate,
      submissionDate: input.submissionDate ?? new Date().toISOString().slice(0, 10),
      locationCount: input.locationCount,
      consecutiveFilmingDays: input.consecutiveFilmingDays,
      isConsecutiveDays: input.isConsecutiveDays,
      onSetCount: input.onSetCount,
      hasSpecialEffects: !!input.hasSpecialEffects,
      hasGunfire: !!input.hasGunfire,
      hasOfficerImpersonation: !!input.hasOfficerImpersonation,
      hasLaneClosures: !!input.hasLaneClosures,
      hasTrafficControl: !!input.hasTrafficControl,
      hasDrivingShots: !!input.hasDrivingShots,
      hasAerialActivity: !!input.hasAerialActivity,
      hasAnimalActivity: !!input.hasAnimalActivity,
      hasAmplifiedMusic: !!input.hasAmplifiedMusic,
      hasLargeLighting: !!input.hasLargeLighting,
      hasLargeLightingAssessment: input.hasLargeLightingAssessment,
      hasGenerators: !!input.hasGenerators,
      hasOpenFlames: !!input.hasOpenFlames,
      hasPropaneHeaters: !!input.hasPropaneHeaters,
      hasSmokeMachines: !!input.hasSmokeMachines,
      hasAlarmBypass: !!input.hasAlarmBypass,
      hasSmoking: !!input.hasSmoking,
      hasPracticalStove: !!input.hasPracticalStove,
      hasGrillingFoodPrep: !!input.hasGrillingFoodPrep,
      hasStunts: !!input.hasStunts,
      filmingOutsideBusinessHours: !!input.filmingOutsideBusinessHours,
      locationTypes: input.locationTypes ?? [],
      isRecParkProperty: !!input.isRecParkProperty,
      recParksActivities: input.recParksActivities ?? [],
    };

    const result = evaluate(shoot);

    const summary = [
      `State: ${result.state}`,
      `Estimated Low Impact total: $${result.feeMath.estimatedTotal}`,
      `Standard tier estimate: $${result.feeMath.standardTierEstimate}`,
      result.feeMath.savingsPercent > 0
        ? `Estimated savings: ${result.feeMath.savingsPercent}%`
        : null,
      result.blockers.length ? `Blockers: ${result.blockers.map((b) => b.label).join("; ")}` : null,
      result.reviewTriggers.length
        ? `Review triggers: ${result.reviewTriggers.map((r) => r.label).join("; ")}`
        : null,
      result.timingNotices.length
        ? `Timing notices: ${result.timingNotices.map((t) => t.label).join("; ")}`
        : null,
      "Estimate only — not a permit approval. See https://info.filmla.com/general-information/low-impact-permit-pilot-program.",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { result },
    };
  },
});
