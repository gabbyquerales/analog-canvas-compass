import { useState, useRef } from "react";
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
  const clearSearchRef = useRef<(() => void) | null>(null);

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
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Topographic background pattern */}
      <div className="topo-bg absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Hero section — top third vertical centering */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-12 pb-6 px-6">
        <span className="absolute top-4 right-8 select-none opacity-40" aria-hidden="true">
          <span className="text-xl text-secondary">✦</span>
          <span className="text-sm text-heading-blue">✧</span>
        </span>

        <h1 className="font-serif text-3xl text-foreground text-center tracking-tight leading-tight mb-2">
          Keep the magic in{' '}
          <span className="relative inline-block text-heading-blue">
            LA.
            <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 40 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4C8 2.5 14 2 20 2.8C26 3.5 32 3 38 2" stroke="hsl(var(--heading-blue))" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </span>
        </h1>

        



        <div className="relative w-full max-w-[380px]">
          <h2 className="font-serif mb-3 text-center text-base text-muted-foreground">LA Film Permit  Jurisdictions, timelines & costs

          </h2>
        </div>
      </div>

      {/* Map + Search */}
      <div className="relative z-10">
        <MapEngine onSelectionChange={handleSelectionChange} clearSearchRef={clearSearchRef} />
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
          onClearSearch={() => clearSearchRef.current?.()}
          neighborhood={neighborhood}
          specialCondition={specialCondition} />

      </div>
    </div>);

};

export default SearchPage;