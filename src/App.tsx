import { useState } from "react";

import { AdvancedFilterBar } from "./components/AdvancedFilterBar";
import { EventsPanel } from "./components/EventsPanel";
import { EventSummary } from "./components/EventSummary";
import { FollowEventsPill } from "./components/FollowEventsPill";
import { LiveControls } from "./components/LiveControls";
import { OrchestratorGraph } from "./components/OrchestratorGraph";
import { TraceIngestPanel } from "./components/TraceIngestPanel";
import { useLiveStreaming } from "./hooks/useLiveStreaming";
import { useTraceData } from "./hooks/useTraceData";
import { RightPanelSlot } from "./plugins";

type ViewMode = "list" | "graph";

export default function App() {
  const {
    errors,
    facets,
    filteredEvents,
    filters,
    setFilters,
    fileName,
    handleFiles,
    loadSampleTrace,
    appendEvents,
  } = useTraceData();

  const {
    live,
    toggleLive,
    paused,
    togglePaused,
    received,
    followTail,
    followLatest,
    bottomRef,
    pendingCount,
    setListApi,
  } = useLiveStreaming({ appendEvents });

  const [view, setView] = useState<ViewMode>("list");

  return (
    <div className="app-shell">
      <main>
        <AdvancedFilterBar
          filters={filters}
          onChange={setFilters}
          facets={facets}
        />

        <LiveControls
          live={live}
          onToggleLive={toggleLive}
          paused={paused}
          onTogglePaused={togglePaused}
          received={received}
          pendingCount={pendingCount}
        />

        <TraceIngestPanel
          fileName={fileName}
          errors={errors}
          onLoadSample={loadSampleTrace}
          onFiles={handleFiles}
        />

        {/* --- VIEW TOGGLER --- */}
        <div
          className="filter-bar"
          style={{ marginBottom: "0.75rem", gap: "0.25rem" }}
        >
          <button
            type="button"
            className={`filter-button ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`filter-button ${view === "graph" ? "active" : ""}`}
            onClick={() => setView("graph")}
          >
            Graph
          </button>
        </div>

        {view === "list" ? (
          <EventsPanel
            events={filteredEvents}
            bottomRef={bottomRef}
            onListApiChange={setListApi}
          />
        ) : (
          <OrchestratorGraph events={filteredEvents} />
        )}

        <FollowEventsPill
          visible={live && !followTail}
          onFollow={followLatest}
        />
      </main>

      <aside>
        <RightPanelSlot events={filteredEvents} />
        <EventSummary
          totalEvents={filteredEvents.length}
          uniqueProviders={
            new Set(filteredEvents.map((e) => e.provider).filter(Boolean)).size
          }
          uniqueSessions={new Set(filteredEvents.map((e) => e.sessionId)).size}
          byType={Object.fromEntries(
            Array.from(new Set(filteredEvents.map((e) => e.type))).map((t) => [
              t,
              filteredEvents.filter((e) => e.type === t).length,
            ])
          )}
        />
      </aside>
    </div>
  );
}
