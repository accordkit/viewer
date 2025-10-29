import { useCallback, useMemo, useState, useDeferredValue } from "react";

import { AdvancedFilterBar } from "./components/AdvancedFilterBar";
import { DropZone } from "./components/DropZone";
import { EventList } from "./components/EventList";
import { EventSummary } from "./components/EventSummary";
import { RightPanelSlot, TopBannerSlot } from "./plugins";
import {
  DEFAULT_FILTERS,
  buildFilterPredicate,
  extractFacets,
  type FilterState,
} from "./utils/eventFilters";
import { parseJsonLines } from "./utils/parseEvents";

import type { TracerEvent } from "@accordkit/tracer";

const SAMPLE_TRACE = [
  // root span
  {
    type: "span",
    ts: "2024-01-01T10:00:00.000Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "root" },
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "app:request",
    durationMs: 1200,
    status: "ok",
  },
  // child span under root
  {
    type: "span",
    ts: "2024-01-01T10:00:00.100Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "child-a", parentSpanId: "root" },
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "llm:completion",
    durationMs: 800,
    status: "ok",
  },
  // message inside child span
  {
    type: "message",
    ts: "2024-01-01T10:00:00.150Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "m1", parentSpanId: "child-a" },
    provider: "openai",
    model: "gpt-4o-mini",
    role: "user",
    content: "Summarize this.",
    format: "text",
  },
  // tool_call inside child span
  {
    type: "tool_call",
    ts: "2024-01-01T10:00:00.300Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "tc1", parentSpanId: "child-a" },
    provider: "openai",
    model: "gpt-4o-mini",
    tool: "searchDocs",
    input: { q: "vector db" },
  },
  // tool_result inside child span
  {
    type: "tool_result",
    ts: "2024-01-01T10:00:00.500Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "tr1", parentSpanId: "child-a" },
    provider: "openai",
    model: "gpt-4o-mini",
    tool: "searchDocs",
    output: { hits: 3 },
    ok: true,
    latencyMs: 100,
  },
  // another child span under root
  {
    type: "span",
    ts: "2024-01-01T10:00:00.950Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "child-b", parentSpanId: "root" },
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "db:query",
    durationMs: 300,
    status: "ok",
    attrs: { table: "docs", where: "topic='vector'" },
  },
  // top-level non-span (orphan), will render above root span
  {
    type: "message",
    ts: "2024-01-01T09:59:59.900Z",
    sessionId: "demo",
    level: "debug",
    ctx: { traceId: "t1", spanId: "prelude" },
    role: "system",
    content: "Trabzonspor!",
    format: "text",
  },
];

export default function App() {
  const [events, setEvents] = useState<TracerEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [fileName, setFileName] = useState<string | null>(null);

  const facets = useMemo(() => extractFacets(events), [events]);

  const deferredQuery = useDeferredValue(filters.q);

  const filteredEvents = useMemo(() => {
    const pred = buildFilterPredicate({ ...filters, q: deferredQuery });
    return events.filter(pred);
  }, [events, filters, deferredQuery]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    const text = await file.text();
    const { events: parsedEvents, errors: parseErrors } = parseJsonLines(text);

    setEvents(parsedEvents);
    setErrors(parseErrors.map((err) => `Line ${err.line}: ${err.message}`));
    setFilters(DEFAULT_FILTERS);
    setFileName(file.name);
  }, []);

  const loadSampleTrace = () => {
    const serialized = SAMPLE_TRACE.map((event) => JSON.stringify(event)).join(
      "\n",
    );
    const { events: parsed } = parseJsonLines(serialized);
    setEvents(parsed);
    setErrors([]);
    setFilters(DEFAULT_FILTERS);
    setFileName("sample-trace.jsonl");
  };

  return (
    <div className="app-shell">
      <main>
        <AdvancedFilterBar
          filters={filters}
          onChange={setFilters}
          facets={facets}
        />
        <TopBannerSlot />
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div className="panel-header">
            <h2>Trace Ingest</h2>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="filter-button"
                onClick={loadSampleTrace}
              >
                Load sample trace
              </button>
              {fileName && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "rgba(148,163,184,0.85)",
                  }}
                >
                  Loaded: <strong>{fileName}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="panel-body">
            {errors.length > 0 && (
              <div className="error-banner">
                <strong>{errors.length} line(s) failed to parse.</strong>
                <ul style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                  {errors.slice(0, 3).map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <DropZone onFiles={handleFiles} />
          </div>
        </div>

        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          {/* <div className="panel-header">
            <h2>Events</h2>
            <FilterBar activeType={filter} onChange={setFilter} />
          </div> */}
          <div className="panel-body">
            <EventList events={filteredEvents} />
          </div>
        </div>
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
            ]),
          )}
        />
      </aside>
    </div>
  );
}
