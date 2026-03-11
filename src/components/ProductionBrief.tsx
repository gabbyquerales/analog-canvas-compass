import { useState, useMemo, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";
import { type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";
import type { LocationResult } from "@/components/MapEngine";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getActivities, calculateFees, type ShootInputs, type FeeLineItem } from "@/lib/feeCalculator";
import posthog from "posthog-js";

interface ProductionBriefProps {
  jurisdiction: JurisdictionResult;
  location: LocationResult;
  neighborhood: string | null;
  specialCondition: SpecialConditionResult | null;
  onBack: () => void;
}

const ACTIVITY_ICONS: Record<string, string> = {
  street_closure: "🚧",
  gunfire_sfx: "💥",
  drone_aerial: "🛸",
  night_shoot: "🌙",
  pyrotechnics: "🔥",
  water_effects: "💧",
  animals: "🐎",
  stunts: "🤸",
};

/* ─── Section IDs for progress tracking ─── */
const SECTIONS = ["shoot", "activities", "production", "location", "prep"] as const;
type SectionId = (typeof SECTIONS)[number];

/* ─── Reusable inline stepper ─── */
function InlineStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  size = "sm",
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "sm" | "lg";
  disabled?: boolean;
}) {
  const btnSize = size === "lg" ? "48px" : "36px";
  const fontSize = size === "lg" ? "28px" : "20px";
  const inputW = size === "lg" ? "50px" : "40px";

  return (
    <div className={`flex items-center gap-2 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
          fontWeight: 600,
          color: "hsl(0, 0%, 35%)",
          minWidth: "64px",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="cursor-pointer select-none flex items-center justify-center transition-all active:scale-95 active:bg-black/[0.03] shrink-0"
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: "50%",
          background: "transparent",
          border: "1px solid hsla(0, 0%, 0%, 0.1)",
          fontSize: "16px",
          fontWeight: 700,
          color: "hsl(0, 0%, 10%)",
        }}
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        className="bg-transparent outline-none text-center font-mono"
        style={{
          width: inputW,
          fontSize: size === "lg" ? "20px" : "14px",
          fontWeight: 600,
          color: "hsl(0, 0%, 10%)",
          MozAppearance: "textfield",
          WebkitAppearance: "none" as any,
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="cursor-pointer select-none flex items-center justify-center transition-all active:scale-95 active:bg-black/[0.03] shrink-0"
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: "50%",
          background: "transparent",
          border: "1px solid hsla(0, 0%, 0%, 0.1)",
          fontSize: "16px",
          fontWeight: 700,
          color: "hsl(0, 0%, 10%)",
        }}
      >
        +
      </button>
    </div>
  );
}

const ProductionBrief = ({ jurisdiction, location, neighborhood, onBack }: ProductionBriefProps) => {
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [shootDays, setShootDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(12);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

  // Production Type state
  const [isMotion, setIsMotion] = useState(true);
  const [crewSize, setCrewSize] = useState(20);
  const [isWeekend, setIsWeekend] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isNonProfit, setIsNonProfit] = useState(false);

  // Location Details state
  const [numberOfLocations, setNumberOfLocations] = useState(1);
  const [isParksLocation, setIsParksLocation] = useState(false);
  const [isBeachLocation, setIsBeachLocation] = useState(false);
  const [isPortLocation, setIsPortLocation] = useState(false);
  const [isFloodControlLocation, setIsFloodControlLocation] = useState(false);
  const [numberOfParkingSpaces, setNumberOfParkingSpaces] = useState(0);

  // Prep & Strike state
  const [prepDays, setPrepDays] = useState(0);
  const [strikeDays, setStrikeDays] = useState(0);

  // Accordion state — only shoot expanded by default
  const [openSections, setOpenSections] = useState<string[]>(["shoot"]);

  // Fee toggle state: excluded conditional fees and included optional fees
  const [excludedFees, setExcludedFees] = useState<Set<string>>(new Set());
  const [includedOptional, setIncludedOptional] = useState<Set<string>>(new Set());

  // Pulse animation on total change
  const [totalPulse, setTotalPulse] = useState(false);
  const prevTotal = useRef<number | null>(null);

  const jurisdictionSlug = jurisdiction.jurisdictionId;

  const availableActivities = useMemo(() => {
    const raw = getActivities();
    return raw.map((a) => ({
      id: a.id,
      activity_name: a.name,
      slug: a.slug,
      icon: ACTIVITY_ICONS[a.slug] ?? "📋",
    }));
  }, []);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculate fees
  const feeResult = useMemo(() => {
    const inputs: ShootInputs = {
      jurisdictionSlug,
      shootDays,
      hoursPerDay,
      crewSize,
      isMotion,
      isStudent,
      isNonProfit,
      selectedActivities: Array.from(selectedActivities),
      isWeekend,
      isParksLocation,
      isBeachLocation,
      isBuildingLocation: false,
      isPortLocation,
      isDWPLocation: false,
      isFloodControlLocation,
      numberOfLocations,
      numberOfParkingSpaces,
      cateringCrewSize: 0,
      numberOfCars: 0,
      prepDays,
      strikeDays,
    };
    return calculateFees(inputs);
  }, [jurisdictionSlug, shootDays, hoursPerDay, crewSize, isMotion, isStudent, isNonProfit, selectedActivities, isWeekend, isParksLocation, isBeachLocation, isPortLocation, isFloodControlLocation, numberOfLocations, numberOfParkingSpaces, prepDays, strikeDays]);

  const { lineItems, estimatedTotal, subtotalFilmLA, subtotalJurisdiction, subtotalPersonnel, subtotalLocation, warnings, whatPeopleMiss } = feeResult;

  

  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (!hasTrackedView.current && lineItems.length > 0) {
      hasTrackedView.current = true;
      posthog.capture("fee_estimate_viewed", {
        jurisdiction_name: jurisdiction.jurisdiction,
        total_estimated_cost: estimatedTotal,
        number_of_line_items: lineItems.length,
      });
    }
  }, [lineItems, jurisdiction.jurisdiction, estimatedTotal]);

  // Progress: count sections user has interacted with
  const sectionProgress = useMemo(() => {
    let touched = 1; // shoot is always "touched" (it's open by default)
    if (selectedActivities.size > 0) touched++;
    if (!isMotion || crewSize !== 20 || isWeekend || isStudent || isNonProfit) touched++;
    if (numberOfLocations > 1 || isParksLocation || isBeachLocation || isPortLocation || isFloodControlLocation || numberOfParkingSpaces > 0) touched++;
    if (prepDays > 0 || strikeDays > 0) touched++;
    return (touched / SECTIONS.length) * 100;
  }, [selectedActivities, isMotion, crewSize, isWeekend, isStudent, isNonProfit, numberOfLocations, isParksLocation, isBeachLocation, isPortLocation, isFloodControlLocation, numberOfParkingSpaces, prepDays, strikeDays]);

  const filmlaItems = lineItems.filter((i) => i.category === "filmla");
  const jurisdictionItems = lineItems.filter((i) => i.category === "jurisdiction");
  const personnelItems = lineItems.filter((i) => i.category === "personnel");
  const locationItems = lineItems.filter((i) => i.category === "location");

  // Fee toggle: determine which items are "active" (included in totals)
  const isFeeActive = (item: FeeLineItem): boolean => {
    if (item.requirementLevel === 'optional') return includedOptional.has(item.id);
    if (item.requirementLevel === 'conditional') return !excludedFees.has(item.id);
    return true; // mandatory
  };

  const toggleFee = (item: FeeLineItem) => {
    if (item.requirementLevel === 'optional') {
      setIncludedOptional((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    } else if (item.requirementLevel === 'conditional') {
      setExcludedFees((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    }
  };

  // Two-section grouping by collection method
  const collectedByFilmla = lineItems.filter((i) => !i.paidDirectly);
  const collectedDirect = lineItems.filter((i) => i.paidDirectly);
  const subtotalCollectedFilmla = collectedByFilmla.filter(isFeeActive).reduce((s, i) => s + i.amount, 0);
  const subtotalCollectedDirect = collectedDirect.filter(isFeeActive).reduce((s, i) => s + i.amount, 0);

  // Adjusted total based on toggles
  const activeTotal = lineItems.filter(isFeeActive).reduce((s, i) => s + i.amount, 0);

  // Range totals (only from active items)
  const activeItems = lineItems.filter(isFeeActive);
  const hasAnyRange = activeItems.some((i) => i.rateLow != null && i.rateHigh != null);
  const totalLow = activeItems.reduce((s, i) => s + (i.rateLow ?? i.amount), 0);
  const totalHigh = activeItems.reduce((s, i) => s + (i.rateHigh ?? i.amount), 0);

  // Pulse animation when total changes
  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== activeTotal) {
      setTotalPulse(true);
      const t = setTimeout(() => setTotalPulse(false), 600);
      return () => clearTimeout(t);
    }
    prevTotal.current = activeTotal;
  }, [activeTotal]);

  const cardStyleBase: React.CSSProperties = {
    background: "hsl(0, 0%, 100%)",
    borderRadius: "12px",
    boxShadow: "0 1px 4px hsla(0, 0%, 0%, 0.06), 0 4px 12px hsla(0, 0%, 0%, 0.04)",
    marginBottom: "12px",
    overflow: "hidden",
  };

  const sectionBorders: Record<string, string> = {
    shoot: "hsl(48, 96%, 53%)",
    activities: "hsl(225, 100%, 50%)",
    production: "hsl(225, 100%, 50%)",
    location: "hsl(0, 84%, 60%)",
    prep: "hsl(0, 84%, 60%)",
  };

  const sectionBorderOpacity: Record<string, number> = {
    shoot: 0.6,
    activities: 0.65,
    production: 0.65,
    location: 0.6,
    prep: 0.6,
  };

  const getCardStyle = (section: string): React.CSSProperties => {
    const color = sectionBorders[section] || "hsl(213, 72%, 59%)";
    const opacity = sectionBorderOpacity[section] || 0.6;
    // Extract HSL values and apply opacity
    const opaqueColor = color.replace("hsl(", "hsla(").replace(")", `, ${opacity})`);
    return {
      ...cardStyleBase,
      borderTop: `2px solid ${opaqueColor}`,
    };
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "hsl(213, 72%, 59%)",
  };

  return (
    <TooltipProvider>
      <div
        className="fixed inset-0 z-40 flex flex-col animate-slide-up-full"
        style={{ background: "hsl(60, 11%, 97%)" }}
      >
        {/* ─── Progress Bar ─── */}
        <div className="shrink-0 max-w-[430px] mx-auto w-full">
          <Progress
            value={sectionProgress}
            className="h-1 rounded-none [&>div]:bg-[hsl(225,100%,50%)]"
            style={{ background: "hsl(0, 0%, 90%)" }}
          />
        </div>

        {/* ─── Header ─── */}
        <div className="shrink-0 max-w-[430px] mx-auto w-full px-5 pt-4 pb-3" style={{ background: "hsl(0, 0%, 100%)" }}>
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={onBack}
              className="cursor-pointer transition-colors flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: "hsl(213, 72%, 59%)" }}
            >
              ← Back
            </button>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "hsl(0, 0%, 55%)",
              }}
            >
              CuriosoLabs
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              fontWeight: 800,
              color: "hsl(0, 0%, 10%)",
              lineHeight: 1.2,
              marginBottom: "4px",
            }}
          >
            Production Brief
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "hsl(213, 72%, 59%)", fontWeight: 500 }}>
            {jurisdiction.jurisdiction}
            {neighborhood ? ` — ${neighborhood}` : ""}
          </p>
          {jurisdiction.regionalProfile && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "hsl(0, 0%, 55%)", marginTop: "2px" }}>
              {jurisdiction.regionalProfile}
            </p>
          )}
          <div style={{ height: "2px", background: "hsl(213, 72%, 59%)", borderRadius: "1px", marginTop: "10px" }} />
        </div>

        {/* ─── Scrollable Content ─── */}
        <div className="flex-1 overflow-y-auto max-w-[430px] mx-auto w-full px-4 pt-3 pb-48" style={{ background: "hsl(60, 11%, 97%)" }}>
          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    background: "hsla(4, 78%, 56%, 0.08)",
                    border: "1px solid hsla(4, 78%, 56%, 0.25)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    marginBottom: "6px",
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    color: "hsl(4, 50%, 35%)",
                  }}
                >
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}

          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={(newSections) => {
              const opened = newSections.filter(s => !openSections.includes(s));
              for (const section of opened) {
                posthog.capture("fee_category_expanded", {
                  category_name: section,
                  jurisdiction_name: jurisdiction.jurisdiction,
                });
              }
              setOpenSections(newSections);
            }}
            className="space-y-0"
          >
            {/* ─── 1. Shoot Parameters ─── */}
            <AccordionItem value="shoot" className="border-b-0" style={getCardStyle("shoot")}>
              <AccordionTrigger className="px-5 py-3 hover:no-underline" style={sectionHeadingStyle}>
                Shoot Parameters
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <div className="space-y-4">
                  <InlineStepper label="Days" value={shootDays} onChange={setShootDays} min={1} max={90} size="lg" />
                  <InlineStepper label="Hrs / Day" value={hoursPerDay} onChange={setHoursPerDay} min={1} max={24} size="lg" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ─── 2. Special Activities ─── */}
            <AccordionItem value="activities" className="border-b-0" style={getCardStyle("activities")}>
              <AccordionTrigger className="px-5 py-3 hover:no-underline" style={sectionHeadingStyle}>
                Special Activities
                {selectedActivities.size > 0 && (
                  <span
                    className="ml-2 inline-flex items-center justify-center"
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "hsl(225, 100%, 50%)",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "hsl(0, 0%, 100%)",
                    }}
                  >
                    {selectedActivities.size}
                  </span>
                )}
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {availableActivities.map((activity) => {
                    const isActive = selectedActivities.has(activity.id);
                    return (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => toggleActivity(activity.id)}
                        className="cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
                        style={{
                          minHeight: "68px",
                          borderRadius: "10px",
                          border: isActive ? "2px solid hsl(225, 100%, 50%)" : "1px solid hsl(0, 0%, 90%)",
                          background: isActive ? "hsla(225, 100%, 50%, 0.1)" : "hsl(0, 0%, 100%)",
                          padding: "8px 4px",
                        }}
                      >
                        <span style={{ fontSize: "22px", lineHeight: 1 }}>{activity.icon}</span>
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: isActive ? "hsl(0, 0%, 10%)" : "hsl(0, 0%, 45%)",
                            textAlign: "center",
                            lineHeight: 1.2,
                          }}
                        >
                          {activity.activity_name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ─── 3. Production Type ─── */}
            <AccordionItem value="production" className="border-b-0" style={getCardStyle("production")}>
              <AccordionTrigger className="px-5 py-3 hover:no-underline" style={sectionHeadingStyle}>
                Production Type
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <div className="space-y-4">
                  {/* Motion / Still segmented toggle */}
                  <div className="flex" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid hsl(0, 0%, 85%)" }}>
                    <button
                      type="button"
                      onClick={() => setIsMotion(true)}
                      className="flex-1 cursor-pointer transition-colors"
                      style={{
                        minHeight: "44px",
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        fontWeight: 600,
                        background: isMotion ? "hsla(225, 100%, 50%, 0.1)" : "hsl(0, 0%, 97%)",
                        color: isMotion ? "hsl(225, 100%, 50%)" : "hsl(0, 0%, 10%)",
                        border: "none",
                        borderRight: isMotion ? "2px solid hsl(225, 100%, 50%)" : "1px solid hsl(0, 0%, 85%)",
                        borderTop: isMotion ? "2px solid hsl(225, 100%, 50%)" : "none",
                        borderBottom: isMotion ? "2px solid hsl(225, 100%, 50%)" : "none",
                        borderLeft: isMotion ? "2px solid hsl(225, 100%, 50%)" : "none",
                      }}
                    >
                      🎬 Motion
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMotion(false)}
                      className="flex-1 cursor-pointer transition-colors"
                      style={{
                        minHeight: "44px",
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        fontWeight: 600,
                        background: !isMotion ? "hsla(225, 100%, 50%, 0.1)" : "hsl(0, 0%, 97%)",
                        color: !isMotion ? "hsl(225, 100%, 50%)" : "hsl(0, 0%, 10%)",
                        border: !isMotion ? "2px solid hsl(225, 100%, 50%)" : "none",
                      }}
                    >
                      📷 Still Photo
                    </button>
                  </div>

                  {/* Crew Size */}
                  <div className="flex items-center gap-2">
                    <InlineStepper label="Crew" value={crewSize} onChange={setCrewSize} min={1} max={500} />
                    {crewSize <= 16 && (
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "hsl(213, 72%, 59%)", fontWeight: 500, whiteSpace: "nowrap" }}>
                        ≤16
                      </span>
                    )}
                  </div>

                  {/* Switches row */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between cursor-pointer" style={{ minHeight: "40px" }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "hsl(0, 0%, 15%)" }}>
                        Weekend / Holiday
                      </span>
                      <Switch checked={isWeekend} onCheckedChange={setIsWeekend} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer" style={{ minHeight: "40px" }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "hsl(0, 0%, 15%)" }}>
                        Student Production
                      </span>
                      <Switch
                        checked={isStudent}
                        onCheckedChange={(v) => {
                          setIsStudent(v);
                          if (v) setIsNonProfit(false);
                        }}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer" style={{ minHeight: "40px" }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "hsl(0, 0%, 15%)" }}>
                        Non-Profit
                      </span>
                      <Switch
                        checked={isNonProfit}
                        onCheckedChange={(v) => {
                          setIsNonProfit(v);
                          if (v) setIsStudent(false);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ─── 4. Location Details ─── */}
            <AccordionItem value="location" className="border-b-0" style={getCardStyle("location")}>
              <AccordionTrigger className="px-5 py-3 hover:no-underline" style={sectionHeadingStyle}>
                Location Details
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <div className="space-y-4">
                  <InlineStepper label="Locations" value={numberOfLocations} onChange={setNumberOfLocations} min={1} max={20} />

                  {/* Location type chips */}
                  {(jurisdictionSlug === "los-angeles" || jurisdictionSlug === "los-angeles-county" || jurisdictionSlug === "culver-city") && (
                    <div>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, color: "hsl(0, 0%, 40%)", marginBottom: "6px" }}>
                        Location Type
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(jurisdictionSlug === "los-angeles" || jurisdictionSlug === "los-angeles-county") && (
                          <ChipButton active={isParksLocation} onClick={() => setIsParksLocation(!isParksLocation)} label="🌳 Parks" />
                        )}
                        {jurisdictionSlug === "los-angeles" && (
                          <ChipButton active={isPortLocation} onClick={() => setIsPortLocation(!isPortLocation)} label="⚓ Port of LA" />
                        )}
                        {jurisdictionSlug === "los-angeles-county" && (
                          <>
                            <ChipButton active={isBeachLocation} onClick={() => setIsBeachLocation(!isBeachLocation)} label="🏖️ Beach" />
                            <ChipButton active={isFloodControlLocation} onClick={() => setIsFloodControlLocation(!isFloodControlLocation)} label="🌊 Flood Control" />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Parking — Culver City only */}
                  {jurisdictionSlug === "culver-city" && (
                    <InlineStepper label="Parking" value={numberOfParkingSpaces} onChange={setNumberOfParkingSpaces} min={0} max={100} />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ─── 5. Prep & Strike ─── */}
            <AccordionItem value="prep" className="border-b-0" style={getCardStyle("prep")}>
              <AccordionTrigger className="px-5 py-3 hover:no-underline" style={sectionHeadingStyle}>
                Prep & Strike
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                {(() => {
                  const prepEnabled = isParksLocation || isBeachLocation || isFloodControlLocation;
                  return (
                    <div className="space-y-3">
                      <InlineStepper label="Prep Days" value={prepDays} onChange={setPrepDays} min={0} max={30} disabled={!prepEnabled} />
                      <InlineStepper label="Strike Days" value={strikeDays} onChange={setStrikeDays} min={0} max={30} disabled={!prepEnabled} />
                      {!prepEnabled && (
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "hsl(0, 0%, 50%)" }}>
                          Only applies to Parks, Beach, or Flood Control locations.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* What People Miss Tips — Collapsible */}
          {whatPeopleMiss.length > 0 && (
            <Collapsible>
              <div
                style={{
                  background: "hsla(225, 100%, 50%, 0.05)",
                  border: "1px solid hsla(225, 100%, 50%, 0.2)",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "12px",
                }}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between cursor-pointer group">
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.15em",
                      color: "hsl(225, 60%, 40%)",
                      margin: 0,
                    }}
                  >
                    💡 What People Miss
                  </h3>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" style={{ color: "hsl(225, 60%, 40%)" }} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {whatPeopleMiss.map((tip, i) => (
                    <p
                      key={i}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "12px",
                        color: "hsl(225, 20%, 30%)",
                        marginBottom: i < whatPeopleMiss.length - 1 ? "4px" : 0,
                      }}
                    >
                      • {tip}
                    </p>
                  ))}
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>

        {/* ─── Full-Screen Ledger Drawer ─── */}
        {ledgerExpanded && (
          <div className="fixed inset-0 z-[65] flex flex-col" onClick={() => setLedgerExpanded(false)}>
            <div className="absolute inset-0 bg-black/40 animate-fade-in" />
            <div
              className="absolute inset-x-0 bottom-0 animate-slide-up-full"
              style={{ top: "80px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="max-w-[430px] mx-auto w-full h-full flex flex-col overflow-y-auto"
                style={{
                  background: "hsl(0, 0%, 100%)",
                  borderTop: "3px solid hsl(213, 72%, 59%)",
                  borderRadius: "16px 16px 0 0",
                  boxShadow: "0 -8px 32px hsla(0, 0%, 0%, 0.15)",
                }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "hsl(0, 0%, 82%)" }} />
                </div>

                <div className="px-6 pt-3 pb-8 flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "18px",
                        fontWeight: 800,
                        color: "hsl(0, 0%, 10%)",
                      }}
                    >
                      Financial Ledger
                    </h3>
                    <button
                      onClick={() => setLedgerExpanded(false)}
                      className="cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "hsl(0, 0%, 45%)",
                        minHeight: "44px",
                        minWidth: "44px",
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div
                    style={{
                      background: "hsla(225, 100%, 50%, 0.04)",
                      border: "1px solid hsla(225, 100%, 50%, 0.1)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      marginBottom: "12px",
                      fontFamily: "var(--font-sans)",
                      fontSize: "10.5px",
                      lineHeight: "1.5",
                      color: "hsl(225, 15%, 45%)",
                    }}
                  >
                    This estimate is based on published FilmLA fee schedules as of February 2026. Actual permit costs may vary based on location-specific requirements and production scope.
                  </div>

                  <div className="space-y-3" style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "hsl(0, 0%, 15%)" }}>
                    {collectedByFilmla.length > 0 && (
                      <LedgerSection title="Permit Fees (collected by FilmLA)" items={collectedByFilmla} subtotal={subtotalCollectedFilmla} isFeeActive={isFeeActive} onToggleFee={toggleFee} />
                    )}

                    {collectedDirect.length > 0 && (
                      <>
                        <LedgerSection title="Provider Fees (paid directly to departments)" items={collectedDirect} subtotal={subtotalCollectedDirect} isFeeActive={isFeeActive} onToggleFee={toggleFee} />
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "hsl(0, 0%, 50%)", marginTop: "-8px", marginBottom: "8px" }}>
                          These fees are paid directly to the service provider, not through FilmLA.
                        </p>
                      </>
                    )}

                    {lineItems.length === 0 && (
                      <div className="flex justify-between items-baseline" style={{ color: "hsl(0, 0%, 55%)" }}>
                        <span>No fees calculated</span>
                        <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
                        <span>$0</span>
                      </div>
                    )}

                    <div style={{ borderTop: "2px solid hsl(0, 0%, 10%)", margin: "12px 0" }} />
                    <div className="flex justify-between items-baseline" style={{ fontSize: "15px" }}>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-sans)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em" }}>ESTIMATED TOTAL</span>
                      <span className="flex-1 mx-3" />
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-mono, monospace)", fontSize: "18px" }}>${activeTotal.toLocaleString()}</span>
                    </div>
                    {hasAnyRange && (
                      <div className="flex justify-end mt-1">
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "hsl(0, 0%, 50%)" }}>
                          Range: ${Math.round(totalLow).toLocaleString()} – ${Math.round(totalHigh).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* ─── Disclaimer Footer ─── */}
                    <div
                      className="mt-5 rounded-lg p-4"
                      style={{
                        background: "hsl(45, 100%, 94%)",
                        border: "1px solid hsl(40, 80%, 82%)",
                      }}
                    >
                      <div className="flex gap-2 items-start mb-2">
                        <span style={{ fontSize: "16px", lineHeight: "1.2" }}>⚠️</span>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 700, color: "hsl(30, 60%, 30%)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Fees not included in this estimate:
                        </span>
                      </div>
                      <ul className="ml-6 space-y-1.5" style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "hsl(30, 40%, 25%)", lineHeight: "1.45" }}>
                        <li className="list-disc"><strong>Location-specific venue fees</strong> — Some parks, buildings, and facilities charge additional use fees not listed in standard rate schedules. Contact FilmLA to confirm.</li>
                        <li className="list-disc"><strong>Insurance costs</strong> — Requirements vary by jurisdiction and activity. Your broker should confirm coverage levels before you apply.</li>
                        <li className="list-disc"><strong>Additional fees</strong> may apply based on scope of activity.</li>
                      </ul>
                      <div className="mt-3 pt-2" style={{ borderTop: "1px solid hsl(40, 60%, 85%)" }}>
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "hsl(30, 40%, 30%)", lineHeight: "1.5" }}>
                          For a complete estimate, contact <strong>FilmLA Solution Services</strong>:<br />
                          📞 213.977.8600 &nbsp;|&nbsp; ✉️ <a href="mailto:info@filmla.com" className="underline" style={{ color: "hsl(225, 70%, 45%)" }}>info@filmla.com</a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sticky Footer Ledger ─── */}
        <div className="shrink-0 max-w-[430px] mx-auto w-full z-[60]">
          <button
            onClick={() => setLedgerExpanded(!ledgerExpanded)}
            className="w-full cursor-pointer transition-opacity hover:opacity-95 px-6 py-4 backdrop-blur-xl"
            style={{
              background: "hsla(0, 0%, 98%, 0.4)",
              borderRadius: "16px 16px 0 0",
              boxShadow: "0 -4px 20px hsla(0, 0%, 0%, 0.03)",
              borderTop: "0.5px solid hsla(0, 0%, 0%, 0.05)",
            }}
          >
            <div className="flex justify-between items-baseline">
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.2em",
                  color: "hsl(0, 0%, 45%)",
                }}
              >
                Est. Permit Costs
              </span>
              <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsla(0, 0%, 0%, 0.08)", marginBottom: "4px" }} />
              <span
                className="transition-all duration-300 font-mono"
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  color: totalPulse ? "hsl(225, 100%, 50%)" : "hsl(0, 0%, 10%)",
                  textShadow: totalPulse ? "0 0 12px hsla(225, 100%, 50%, 0.4)" : "none",
                  transform: totalPulse ? "scale(1.08)" : "scale(1)",
                }}
              >
                ${activeTotal.toLocaleString()}
              </span>
            </div>
            {hasAnyRange && (
              <div className="text-right mt-0.5">
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "hsl(0, 0%, 50%)" }}>
                  Range: ${Math.round(totalLow).toLocaleString()} – ${Math.round(totalHigh).toLocaleString()}
                </span>
              </div>
            )}
            <p className="text-center mt-2">
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "17px",
                  fontWeight: 500,
                  color: "hsl(225, 100%, 50%)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                View full ledger
              </span>
            </p>
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
};

/* ─── Chip button for location types ─── */
function ChipButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer transition-colors"
      style={{
        minHeight: "40px",
        padding: "6px 14px",
        borderRadius: "20px",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        fontWeight: 600,
        border: active ? "2px solid hsl(225, 100%, 50%)" : "1.5px solid hsl(0, 0%, 85%)",
        background: active ? "hsla(225, 100%, 50%, 0.1)" : "hsl(0, 0%, 100%)",
        color: "hsl(0, 0%, 15%)",
      }}
    >
      {label}
    </button>
  );
}

/** Reusable ledger section component */
function LedgerSection({
  title,
  items,
  subtotal,
  isFeeActive,
  onToggleFee,
}: {
  title: string;
  items: FeeLineItem[];
  subtotal: number;
  isFeeActive: (item: FeeLineItem) => boolean;
  onToggleFee: (item: FeeLineItem) => void;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.12em",
          color: "hsl(213, 72%, 59%)",
          marginBottom: "8px",
        }}
      >
        {title}
      </p>
      {items.map((item) => {
        const active = isFeeActive(item);
        const isToggleable = item.requirementLevel === 'conditional' || item.requirementLevel === 'optional';
        return (
          <div
            key={item.id}
            className="mb-1.5 transition-opacity duration-200"
            style={{ opacity: active ? 1 : 0.4 }}
          >
            <div className="flex items-center gap-2">
              {isToggleable && (
                <Switch
                  checked={active}
                  onCheckedChange={() => onToggleFee(item)}
                  className="shrink-0 scale-75 origin-left"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate max-w-[55%] flex items-center gap-1 cursor-help" style={{ fontWeight: 500 }}>
                        {item.name}
                        {item.paidDirectly && <span style={{ fontSize: "10px", color: "hsl(4, 78%, 56%)" }}>★</span>}
                        {item.isEstimate && <span style={{ fontSize: "10px", color: "hsl(40, 80%, 50%)" }}>~</span>}
                        {item.requirementNote && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info size={11} className="shrink-0" style={{ color: "hsl(213, 72%, 59%)" }} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[280px]" style={{ fontFamily: "var(--font-sans)" }}>
                              <p>{item.requirementNote}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[280px]" style={{ fontFamily: "var(--font-sans)" }}>
                      <div>
                        {item.per && <p>Per: {item.per}</p>}
                        {item.department && <p>Dept: {item.department}</p>}
                        {item.note && <p>{item.note}</p>}
                        {item.paidDirectly && <p style={{ color: "hsl(4, 78%, 56%)" }}>Paid directly to provider</p>}
                        {item.requirementLevel && <p>Requirement: {item.requirementLevel}</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
                  {item.rateLow != null && item.rateHigh != null ? (
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", textDecoration: active ? "none" : "line-through" }}>
                      ${Math.round(item.rateLow).toLocaleString()} – ${Math.round(item.rateHigh).toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", textDecoration: active ? "none" : "line-through" }}>
                      ${item.amount.toLocaleString()}
                    </span>
                  )}
                </div>
                {item.rateLow != null && item.rateHigh != null && (
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "hsl(0, 0%, 55%)", marginTop: "1px", textAlign: "right" }}>
                    Estimate uses midpoint: ${item.amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between items-baseline mt-2 pt-1" style={{ borderTop: "1px solid hsl(0, 0%, 90%)" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(0, 0%, 45%)" }}>Subtotal</span>
        <span style={{ fontSize: "12px", fontWeight: 700 }}>${subtotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default ProductionBrief;
