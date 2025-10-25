import { useCallback, useMemo, useState } from "react";


import { DropZone } from "./components/DropZone";
import { EventList } from "./components/EventList";
import { EventSummary } from "./components/EventSummary";
import { FilterBar } from "./components/FilterBar";
import { PluginProvider, RightPanelSlot, TopBannerSlot } from "./plugins";
import { parseJsonLines } from "./utils/parseEvents";

import type { TracerEvent } from "@accordkit/tracer";

type EventFilter = "all" | TracerEvent["type"];

const SAMPLE_TRACE = [
  {
    ts: new Date().toISOString(),
    sessionId: "sample-session",
    level: "info",
    ctx: { traceId: "tr_sample", spanId: "sp_prompt" },
    provider: "openai",
    model: "gpt-4o-mini",
    type: "message",
    role: "user",
    content: "Generate a limerick about AccordKit.",
  },
  {
    ts: new Date(Date.now() + 1500).toISOString(),
    sessionId: "sample-session",
    level: "info",
    ctx: { traceId: "tr_sample", spanId: "sp_tool", parentSpanId: "sp_prompt" },
    provider: "openai",
    model: "gpt-4o-mini",
    type: "tool_result",
    tool: "chat.completions.create",
    output: {
      text: "There once was a tracer named Kit,\nWhose spans always perfectly fit...",
    },
    ok: true,
    latencyMs: 1420,
  },
  {
    ts: new Date(Date.now() + 1600).toISOString(),
    sessionId: "sample-session",
    level: "info",
    ctx: {
      traceId: "tr_sample",
      spanId: "sp_usage",
      parentSpanId: "sp_prompt",
    },
    provider: "openai",
    model: "gpt-4o-mini",
    type: "usage",
    inputTokens: 45,
    outputTokens: 68,
    $ext: { totalTokens: 113 },
  },
];

export default function App() {
  const [events, setEvents] = useState<TracerEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [fileName, setFileName] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const byType = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((event) => {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    });
    return counts;
  }, [events]);

  const uniqueSessions = useMemo(
    () => new Set(events.map((event) => event.sessionId)).size,
    [events]
  );
  const uniqueProviders = useMemo(
    () => new Set(events.map((event) => event.provider ?? "unknown")).size,
    [events]
  );

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    const text = await file.text();
    const { events: parsedEvents, errors: parseErrors } = parseJsonLines(text);

    setEvents(parsedEvents);
    setErrors(parseErrors.map((err) => `Line ${err.line}: ${err.message}`));
    setFilter("all");
    setFileName(file.name);
  }, []);

  const loadSampleTrace = () => {
    const serialized = SAMPLE_TRACE.map((event) => JSON.stringify(event)).join(
      "\n"
    );
    const { events: parsed } = parseJsonLines(serialized);
    setEvents(parsed);
    setErrors([]);
    setFilter("all");
    setFileName("sample-trace.jsonl");
  };

  return (
    <PluginProvider>
      <div className="app-shell">
        <main>
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
            <div className="panel-header">
              <h2>Events</h2>
              <FilterBar activeType={filter} onChange={setFilter} />
            </div>
            <div className="panel-body">
              <EventList events={filteredEvents} />
            </div>
          </div>
        </main>

        <aside>
          <RightPanelSlot events={events} />
          <EventSummary
            totalEvents={events.length}
            uniqueProviders={uniqueProviders}
            uniqueSessions={uniqueSessions}
            byType={byType}
          />
        </aside>
      </div>
    </PluginProvider>
  );
}
