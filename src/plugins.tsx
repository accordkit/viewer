import { createContext, useContext } from "react";

import type { TracerEvent } from "@accordkit/tracer";
import type { ReactNode } from "react";

interface PluginSlots {
  TopBanner?: () => ReactNode;
  RightPanel?: (props: { events: TracerEvent[] }) => ReactNode;
}

const PluginContext = createContext<PluginSlots | null>(null);

interface PluginProviderProps {
  children: ReactNode;
  slots?: PluginSlots;
}

export function PluginProvider({ children, slots }: PluginProviderProps) {
  return (
    <PluginContext.Provider value={slots ?? null}>
      {children}
    </PluginContext.Provider>
  );
}

export function TopBannerSlot() {
  const value = useContext(PluginContext);
  if (value?.TopBanner) {
    return <>{value.TopBanner()}</>;
  }

  return (
    <div className="top-banner">
      <div>
        <strong>AccordKit Viewer (alpha)</strong>
        <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
          Drop a JSONL trace to explore events. Customize this banner via plugin
          slots.
        </div>
      </div>
      <a
        href="https://github.com/accordkit"
        target="_blank"
        rel="noreferrer"
        style={{
          padding: "0.45rem 1rem",
          borderRadius: "999px",
          background: "rgba(15,23,42,0.45)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#f8fafc",
          fontSize: "0.85rem",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        View Docs
      </a>
    </div>
  );
}

export function RightPanelSlot({ events }: { events: TracerEvent[] }) {
  const value = useContext(PluginContext);
  if (value?.RightPanel) {
    return <>{value.RightPanel({ events })}</>;
  }

  const providers = new Set(events.map((event) => event.provider ?? "unknown"));
  const sessions = new Set(events.map((event) => event.sessionId));

  return (
    <div className="panel right-panel">
      <div className="panel-header">
        <h2>Session Stats</h2>
      </div>
      <div className="panel-body">
        <div className="summary-card">
          <h3>Providers</h3>
          <strong>{providers.size}</strong>
        </div>
        <div className="summary-card">
          <h3>Sessions</h3>
          <strong>{sessions.size}</strong>
        </div>
        <p
          style={{
            margin: "0.8rem 0 0",
            fontSize: "0.85rem",
            color: "rgba(148,163,184,0.8)",
          }}
        >
          Override via plugin slots to inject custom analytics or TraceTalk
          panels.
        </p>
      </div>
    </div>
  );
}
