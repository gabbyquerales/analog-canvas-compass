import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { calculateFees, DEFAULT_INPUTS } from "../../feeCalculator";

export default defineTool({
  name: "calculate_permit_fees",
  title: "Calculate film permit fees",
  description:
    "Estimate itemized film permit fees for a planned shoot in a supported jurisdiction (e.g. City of Los Angeles, LA County). Combines FilmLA base fees with jurisdiction-specific personnel and location surcharges. Returns line items, subtotals, an estimated total, warnings, and estimated lead time. Optionally applies FilmLA Low Impact pilot pricing (LA City motion only). Estimate only — not a quote.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    jurisdictionSlug: z
      .string()
      .describe("Jurisdiction slug, e.g. 'los-angeles', 'los-angeles-county'."),
    shootDays: z.number().int().min(1).describe("Number of shoot days."),
    hoursPerDay: z.number().min(1).max(24).describe("Hours per shoot day."),
    crewSize: z.number().int().min(1).describe("Crew size."),
    isMotion: z.boolean().describe("True for motion filming, false for still photo."),
    isStudent: z.boolean().optional(),
    isNonProfit: z.boolean().optional(),
    selectedActivities: z
      .array(z.string())
      .optional()
      .describe("Activity IDs, e.g. street_closure, gunfire_sfx, pyrotechnics, drone_aerial."),
    isWeekend: z.boolean().optional(),
    isParksLocation: z.boolean().optional(),
    isBeachLocation: z.boolean().optional(),
    isBuildingLocation: z.boolean().optional(),
    isPortLocation: z.boolean().optional(),
    isDWPLocation: z.boolean().optional(),
    isFloodControlLocation: z.boolean().optional(),
    numberOfLocations: z.number().int().min(1).optional(),
    numberOfParkingSpaces: z.number().int().min(0).optional(),
    cateringCrewSize: z.number().int().min(0).optional(),
    numberOfCars: z.number().int().min(0).optional(),
    prepDays: z.number().int().min(0).optional(),
    strikeDays: z.number().int().min(0).optional(),
    lowImpactTier: z
      .boolean()
      .optional()
      .describe(
        "Apply FilmLA Low Impact pilot pricing. Only affects LA City motion, non-student, non-profit shoots; ignored otherwise. Confirm eligibility with evaluate_low_impact_precheck first.",
      ),
  },
  handler: (input) => {
    const inputs = {
      ...DEFAULT_INPUTS,
      ...input,
      isStudent: !!input.isStudent,
      isNonProfit: !!input.isNonProfit,
      selectedActivities: input.selectedActivities ?? [],
      isWeekend: !!input.isWeekend,
      isParksLocation: !!input.isParksLocation,
      isBeachLocation: !!input.isBeachLocation,
      isBuildingLocation: !!input.isBuildingLocation,
      isPortLocation: !!input.isPortLocation,
      isDWPLocation: !!input.isDWPLocation,
      isFloodControlLocation: !!input.isFloodControlLocation,
      numberOfLocations: input.numberOfLocations ?? 1,
      numberOfParkingSpaces: input.numberOfParkingSpaces ?? 0,
      cateringCrewSize: input.cateringCrewSize ?? 0,
      numberOfCars: input.numberOfCars ?? 0,
      prepDays: input.prepDays ?? 0,
      strikeDays: input.strikeDays ?? 0,
    };

    const result = calculateFees(inputs);

    const lines = result.lineItems.map(
      (li) => `- ${li.name}: $${Math.round(li.amount)}${li.isEstimate ? " (est.)" : ""}${li.note ? ` — ${li.note}` : ""}`,
    );

    const text = [
      `Jurisdiction: ${result.jurisdiction?.name ?? inputs.jurisdictionSlug}`,
      `Estimated total: $${Math.round(result.estimatedTotal)}`,
      `Estimated lead time: ${result.estimatedLeadDays} days${result.complexTimeline ? " (complex)" : ""}`,
      "",
      "Line items:",
      ...lines,
      result.warnings.length ? `\nWarnings:\n${result.warnings.map((w) => `- ${w}`).join("\n")}` : "",
      "\nEstimate only — not a quote. Cross-check with FilmLA before submitting.",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: { result },
    };
  },
});
