import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

posthog.init("phc_HhZ5QPjHDfoCBTC7CK65QxDTILG7LQiMGFyq3aVcE5P", {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: false,
});

const params = new URLSearchParams(window.location.search);
posthog.capture("session_started", {
  entry_source: params.get("utm_source") || "direct",
  utm_medium: params.get("utm_medium") || null,
  utm_campaign: params.get("utm_campaign") || null,
});

createRoot(document.getElementById("root")!).render(<App />);
