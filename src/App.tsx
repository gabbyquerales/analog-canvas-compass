import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import SearchPage from "./pages/SearchPage";
import TimelinePage from "./pages/TimelinePage";
import ComparisonPage from "./pages/ComparisonPage";
import NotFound from "./pages/NotFound";

import WobblyFilter from "./components/WobblyFilter";

const queryClient = new QueryClient();

const App = () => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <WobblyFilter />
        <BrowserRouter>
          <div className="max-w-[430px] mx-auto min-h-screen">
            <Routes>
              <Route path="/" element={<SearchPage onConfirmedChange={setConfirmed} />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
