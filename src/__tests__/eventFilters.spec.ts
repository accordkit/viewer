import { TracerEvent } from "@accordkit/tracer";
import { describe, it, expect } from "vitest";

import { AppTracerEvent } from "../types/events";
import {
  DEFAULT_FILTERS,
  buildFilterPredicate,
  extractFacets,
  type FilterState,
} from "../utils/eventFilters";
import { normalizeEvent } from "../utils/normalizeEvent";

function ev(partial: Partial<TracerEvent>): AppTracerEvent {
  const raw = {
    ts: partial.ts ?? "2024-01-01T00:00:00.000Z",
    sessionId: partial.sessionId ?? "s1",
    level: partial.level ?? "info",
    ctx: partial.ctx ?? { traceId: "t1", spanId: "x" },
    type: partial.type ?? "message",
    provider: partial.provider,
    model: partial.model,
    ...partial,
  } as TracerEvent;

  return normalizeEvent(raw);
}

const events: AppTracerEvent[] = [
  ev({
    type: "message",
    provider: "openai",
    model: "gpt-4o-mini",
    role: "user",
    content: "hello",
    format: "text",
  }),
  ev({
    type: "tool_call",
    provider: "openai",
    tool: "search",
    input: { q: "vectordb" },
  }),
  ev({
    type: "tool_result",
    provider: "openai",
    output: { hits: 2 },
    ok: true,
  }),
  ev({
    type: "span",
    provider: "anthropic",
    operation: "db:query",
    durationMs: 300,
    status: "ok",
    ts: "2024-01-01T00:00:01.000Z",
  }),
];

describe("extractFacets", () => {
  it("collects distinct types/providers/models/levels", () => {
    const f = extractFacets(events);
    expect(f.types.sort()).toEqual(
      ["message", "span", "tool_call", "tool_result"].sort()
    );
    expect(f.providers.sort()).toEqual(["openai", "anthropic"].sort());
  });
});

describe("buildFilterPredicate", () => {
  it("filters by type set", () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      types: new Set(["span"]),
    };
    const pred = buildFilterPredicate(filters);
    const out = events.filter(pred);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("span");
  });

  it("filters by provider + model", () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      providers: new Set(["openai"]),
      models: "all",
    };
    const pred = buildFilterPredicate(filters);
    const out = events.filter(pred);
    expect(out.every((e) => e.provider === "openai")).toBe(true);
  });

  it("full-text q matches message content and span operation", () => {
    const pred1 = buildFilterPredicate({ ...DEFAULT_FILTERS, q: "hello" });
    expect(events.filter(pred1).some((e) => e.type === "message")).toBe(true);

    const pred2 = buildFilterPredicate({ ...DEFAULT_FILTERS, q: "db:query" });
    expect(events.filter(pred2).some((e) => e.type === "span")).toBe(true);
  });
});
