import { useLocation, useNavigate } from "react-router-dom";
import { Search, Clock, BarChart3, Lock } from "lucide-react";

interface BottomNavProps {
  confirmed?: boolean;
}

const tabs = [
  { path: "/", label: "Search", icon: Search, locked: false },
  { path: "/timeline", label: "Timeline", icon: Clock, locked: true },
  { path: "/comparison", label: "Comparison", icon: BarChart3, locked: true },
];

const BottomNav = ({ confirmed = false }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background wobbly-border-top z-50">
      <div className="flex justify-around items-center max-w-[430px] mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const isLocked = tab.locked && !confirmed;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => !isLocked && navigate(tab.path)}
              className={`flex flex-col items-center justify-center min-h-[56px] min-w-[80px] px-3 py-2 transition-all duration-300 relative ${
                isLocked ? "cursor-not-allowed" : isActive ? "opacity-100" : "opacity-40"
              }`}
              style={{
                touchAction: "manipulation",
                ...(isLocked ? { filter: "grayscale(1)", opacity: 0.5 } : {}),
              }}
              disabled={isLocked}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {isLocked && (
                  <Lock size={10} className="absolute -top-1 -right-2 text-muted-foreground" />
                )}
              </div>
              <span className="font-handwritten text-sm mt-1">{tab.label}</span>
              {isActive && !isLocked && (
                <span className="tape-note text-[10px] font-handwritten absolute -top-3 px-2 py-0">
                  here!
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
