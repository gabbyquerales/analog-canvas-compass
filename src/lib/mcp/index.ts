import { defineMcp } from "@lovable.dev/mcp-js";
import evaluateLowImpactPrecheck from "./tools/evaluate-low-impact-precheck";
import calculatePermitFees from "./tools/calculate-permit-fees";

export default defineMcp({
  name: "kairo-mcp",
  title: "KAIRO — Film Permit Intelligence",
  version: "0.1.0",
  instructions:
    "Tools for planning City of Los Angeles (and LA County) film permits. Use `evaluate_low_impact_precheck` to check whether a shoot likely qualifies for FilmLA's Low Impact Permit Pilot Program and see the fee comparison. Use `calculate_permit_fees` to itemize base FilmLA and jurisdiction-specific fees for a planned shoot. All outputs are deterministic estimates sourced from public FilmLA rules — not permit approvals or binding quotes.",
  tools: [evaluateLowImpactPrecheck, calculatePermitFees],
});
