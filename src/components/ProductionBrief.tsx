import { useState, useMemo, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";
import type { LocationResult } from "@/components/MapEngine";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getActivities, calculateFees, type ShootInputs, type FeeLineItem } from "@/lib/feeCalculator";

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
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "sm" | "lg";
}) {
  const btnSize = size === "lg" ? "48px" : "36px";
  const fontSize = size === "lg" ? "28px" : "20px";
  const inputW = size === "lg" ? "50px" : "40px";

  return (
    <div className="flex items-center gap-2">
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

  // Pulse animation when total changes
  useEffect(() => {
    if (prevTotal.current !== null && prevTotal.current !== estimatedTotal) {
      setTotalPulse(true);
      const t = setTimeout(() => setTotalPulse(false), 600);
      return () => clearTimeout(t);
    }
    prevTotal.current = estimatedTotal;
  }, [estimatedTotal]);

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

  /* ─── Card style applied to AccordionItem ─── */
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
              Curioso Labs
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
            onValueChange={setOpenSections}
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
                <div className="space-y-3">
                  <InlineStepper label="Prep Days" value={prepDays} onChange={setPrepDays} min={0} max={30} />
                  <InlineStepper label="Strike Days" value={strikeDays} onChange={setStrikeDays} min={0} max={30} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* What People Miss Tips */}
          {whatPeopleMiss.length > 0 && (
            <div
              style={{
                background: "hsla(225, 100%, 50%, 0.05)",
                border: "1px solid hsla(225, 100%, 50%, 0.2)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.15em",
                  color: "hsl(225, 60%, 40%)",
                  marginBottom: "8px",
                }}
              >
                💡 What People Miss
              </h3>
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
            </div>
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

                  <div className="space-y-3" style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "hsl(0, 0%, 15%)" }}>
                    {filmlaItems.length > 0 && <LedgerSection title="FilmLA Fees" items={filmlaItems} subtotal={subtotalFilmLA} />}
                    {jurisdictionItems.length > 0 && <LedgerSection title="Jurisdiction Fees" items={jurisdictionItems} subtotal={subtotalJurisdiction} />}
                    {personnelItems.length > 0 && <LedgerSection title="Personnel" items={personnelItems} subtotal={subtotalPersonnel} />}
                    {locationItems.length > 0 && <LedgerSection title="Location Fees" items={locationItems} subtotal={subtotalLocation} />}

                    {lineItems.length === 0 && (
                      <div className="flex justify-between items-baseline" style={{ color: "hsl(0, 0%, 55%)" }}>
                        <span>No fees calculated</span>
                        <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
                        <span>$0</span>
                      </div>
                    )}

                    <div style={{ borderTop: "2px solid hsl(0, 0%, 10%)", margin: "12px 0" }} />
                    <div className="flex justify-between items-baseline" style={{ fontSize: "15px" }}>
                      <span style={{ fontWeight: 800 }}>Total Permit Costs</span>
                      <span className="flex-1 mx-3" />
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-serif)", fontSize: "18px" }}>${estimatedTotal.toLocaleString()}</span>
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
                  fontSize: "10px",
                  fontWeight: 600,
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
                  fontWeight: 700,
                  color: totalPulse ? "hsl(225, 100%, 50%)" : "hsl(0, 0%, 10%)",
                  textShadow: totalPulse ? "0 0 12px hsla(225, 100%, 50%, 0.4)" : "none",
                  transform: totalPulse ? "scale(1.08)" : "scale(1)",
                }}
              >
                ${estimatedTotal.toLocaleString()}
              </span>
            </div>
            <p className="text-center mt-2">
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
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
function LedgerSection({ title, items, subtotal }: { title: string; items: FeeLineItem[]; subtotal: number }) {
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
      {items.map((item) => (
        <div key={item.id} className="flex justify-between items-baseline mb-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate max-w-[55%] flex items-center gap-1 cursor-help" style={{ fontWeight: 500 }}>
                {item.name}
                {item.paidDirectly && <span style={{ fontSize: "10px", color: "hsl(4, 78%, 56%)" }}>★</span>}
                {item.isEstimate && <span style={{ fontSize: "10px", color: "hsl(40, 80%, 50%)" }}>~</span>}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[280px]" style={{ fontFamily: "var(--font-sans)" }}>
              <div>
                {item.per && <p>Per: {item.per}</p>}
                {item.department && <p>Dept: {item.department}</p>}
                {item.note && <p>{item.note}</p>}
                {item.paidDirectly && <p className="text-red-400">Paid directly to provider</p>}
              </div>
            </TooltipContent>
          </Tooltip>
          <span className="flex-1 mx-3 border-b border-dotted" style={{ borderColor: "hsl(0, 0%, 85%)", marginBottom: "3px" }} />
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>${item.amount.toLocaleString()}</span>
        </div>
      ))}
      <div className="flex justify-between items-baseline mt-2 pt-1" style={{ borderTop: "1px solid hsl(0, 0%, 90%)" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(0, 0%, 45%)" }}>Subtotal</span>
        <span style={{ fontSize: "12px", fontWeight: 700 }}>${subtotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default ProductionBrief;
