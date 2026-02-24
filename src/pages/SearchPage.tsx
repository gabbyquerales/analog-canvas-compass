import { useState } from "react";
import MapEngine, { type LocationResult, type MapSelectionResult, type MatchStatus } from "@/components/MapEngine";
import InfoCards from "@/components/InfoCards";
import { type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";

interface SearchPageProps {
  onConfirmedChange?: (confirmed: boolean) => void;
}

const SearchPage = ({ onConfirmedChange }: SearchPageProps) => {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionResult | null>(null);
  const [cdtfaName, setCdtfaName] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [specialCondition, setSpecialCondition] = useState<SpecialConditionResult | null>(null);

  const handleSelectionChange = (result: MapSelectionResult) => {
    setLocation(result.location);
    setJurisdiction(result.jurisdiction);
    setCdtfaName(result.cdtfaName);
    setMatchStatus(result.matchStatus);
    setNeighborhood(result.neighborhood);
    setSpecialCondition(result.specialCondition);
    setConfirmed(false);
    onConfirmedChange?.(false);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirmedChange?.(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-curioso-bg relative overflow-hidden">
      {/* Topographic background pattern */}
      <div className="topo-bg absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Hero section */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-10 pb-4 px-5">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground text-center tracking-tight leading-tight mb-2">
          Stop Wasting Production Budget.
        </h1>

        <p className="font-sans text-sm text-muted-foreground text-center max-w-[340px] mx-auto mb-5 leading-relaxed">
          Pinpoint jurisdictions, calculate exact fees, and nail your permit timeline.
        </p>

        <div className="relative w-full max-w-[380px]">
          <h2 className="font-serif text-lg text-foreground mb-3 text-center">
            Where are we shooting?
          </h2>
        </div>
      </div>

      {/* Data-driven value cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2 px-4 pb-4 max-w-[480px] mx-auto">
        <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
          <h3 className="font-sans text-[10px] uppercase tracking-widest text-heading-blue font-semibold mb-1">Costs</h3>
          <p className="font-sans text-xs text-muted-foreground leading-snug">
            Avoid the <span className="font-semibold text-foreground">$931 Trap</span>. Motion permits are non-refundable. Verify your fee first.
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
          <h3 className="font-sans text-[10px] uppercase tracking-widest text-heading-blue font-semibold mb-1">Timelines</h3>
          <p className="font-sans text-xs text-muted-foreground leading-snug">
            <span className="font-semibold text-foreground">3–5 Day Lead Time</span>. Get exact deadlines for 88 cities to avoid late rejections.
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
          <h3 className="font-sans text-[10px] uppercase tracking-widest text-heading-blue font-semibold mb-1">Borders</h3>
          <p className="font-sans text-xs text-muted-foreground leading-snug">
            <span className="font-semibold text-foreground">One-Block Accuracy</span>. We pinpoint the exact jurisdiction so you know who to pay.
          </p>
        </div>
      </div>

      {/* Map + Search */}
      <div className="relative z-10">
        <MapEngine onSelectionChange={handleSelectionChange} />
      </div>

      {/* Info Cards — overlapping report card */}
      <div className="relative z-20 mt-4">
        <InfoCards
          location={location}
          jurisdiction={jurisdiction}
          cdtfaName={cdtfaName}
          matchStatus={matchStatus}
          confirmed={confirmed}
          onConfirm={handleConfirm}
          neighborhood={neighborhood}
          specialCondition={specialCondition}
        />
      </div>

      {/* Kairo Tip */}
      <div className="relative z-10 px-5 py-4 max-w-[480px] mx-auto">
        <p className="font-sans text-xs text-muted-foreground leading-relaxed bg-card border border-border rounded-lg p-3 shadow-sm">
          💡 <span className="font-semibold text-foreground">Tip:</span> 16+ crew members bumps still photo fees from $104 to $931. We'll flag it for you.
        </p>
      </div>
    </div>
  );
};

export default SearchPage;
