import { useState } from "react";
import MapEngine, { type LocationResult, type MapSelectionResult, type MatchStatus } from "@/components/MapEngine";
import InfoCards from "@/components/InfoCards";
import { type JurisdictionResult, type SpecialConditionResult } from "@/lib/jurisdiction";

// Context to share confirmed state with BottomNav
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
    <div className="flex flex-col items-center pt-20 min-h-[80vh]">
      <div className="px-8 relative">
        {/* Sparkles cluster - top right */}
        <span className="absolute -top-6 right-4 select-none" aria-hidden="true">
          <span className="text-xl" style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
          <span className="text-sm" style={{ color: 'hsl(210, 100%, 37%)' }}>✧</span>
          
        </span>

        <h1 className="font-headline text-3xl text-foreground text-center uppercase tracking-tight leading-none mb-4">
          Keep the magic<br />in{' '}
          <span className="relative inline-block text-heading-blue">
            LA.
            <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 40 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 4C8 2.5 14 2 20 2.8C26 3.5 32 3 38 2" stroke="hsl(220, 100%, 33%)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </span>
        </h1>

        {/* Hand-drawn triple-line heart */}
        <div className="flex justify-center mb-4 relative" aria-hidden="true">
          <span className="absolute -left-5 top-0 text-xs select-none" style={{ color: 'hsl(48, 100%, 50%)' }}>✦</span>
          
          
          <span className="absolute -right-3 -top-1 text-xs select-none" style={{ color: 'hsl(48, 100%, 50%)' }}>✧</span>
          <svg width="28" height="26" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 24C14 24 2 16 2 8C2 4 5 1 9 2C11.5 2.8 13 5 14 7C15 5 16.5 2.8 19 2C23 1 26 4 26 8C26 16 14 24 14 24Z" stroke="hsl(7, 80%, 56%)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 22C14 22 4 15 4 9C4 5.5 6.5 3 10 3.5C12 4 13.5 6 14 7.5C14.5 6 16 4 18 3.5C21.5 3 24 5.5 24 9C24 15 14 22 14 22Z" stroke="hsl(7, 80%, 56%)" strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            <path d="M14 20C14 20 6 14 6 10C6 7 8 5 11 5.5C12.5 5.8 13.5 7 14 8C14.5 7 15.5 5.8 17 5.5C20 5 22 7 22 10C22 14 14 20 14 20Z" stroke="hsl(7, 80%, 56%)" strokeWidth="0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
          </svg>
        </div>

        <p className="text-muted-foreground text-center max-w-[280px] mx-auto mb-16 leading-snug text-xl font-[serif]">Navigating the 88. Keeping it LA.

        </p>


        <div className="relative">
          <span className="absolute -left-6 top-1 select-none" aria-hidden="true">
            
          </span>
          <h2 className="font-handwritten text-3xl text-foreground mb-3 text-center leading-tight">
            Where are we shooting?
          </h2>
        </div>
      </div>

      <MapEngine onSelectionChange={handleSelectionChange} />
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

    </div>);

};

export default SearchPage;