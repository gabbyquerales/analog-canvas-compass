import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Component, useState, useEffect, type ReactNode, type ErrorInfo } from "react";
import posthog from "posthog-js";
import SearchPage from "./pages/SearchPage";
import TimelinePage from "./pages/TimelinePage";
import ComparisonPage from "./pages/ComparisonPage";
import NotFound from "./pages/NotFound";

import WobblyFilter from "./components/WobblyFilter";

const queryClient = new QueryClient();

const PAGE_NAMES: Record<string, string> = {
  "/": "search",
  "/timeline": "timeline",
  "/comparison": "comparison",
};

function PostHogPageview() {
  const location = useLocation();
  useEffect(() => {
    posthog.capture("page_viewed", {
      page_name: PAGE_NAMES[location.pathname] || "unknown",
      referrer: document.referrer || null,
    });
  }, [location]);
  return null;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AnalyticsErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    posthog.capture("ui_error", {
      error_message: error.message,
      component_name: errorInfo.componentStack?.split("\n")[1]?.trim() || "unknown",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-6 text-center">
          <div>
            <h2 className="font-serif text-lg mb-2">Something went wrong</h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="font-sans text-sm text-heading-blue underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <WobblyFilter />
        <BrowserRouter>
          <PostHogPageview />
          <AnalyticsErrorBoundary>
            <div className="max-w-[430px] mx-auto min-h-screen">
              <Routes>
                <Route path="/" element={<SearchPage onConfirmedChange={setConfirmed} />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AnalyticsErrorBoundary>
          
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
