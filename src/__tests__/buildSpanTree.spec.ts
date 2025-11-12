import { TracerEvent } from "@accordkit/tracer";
import { describe, it, expect } from "vitest";

import { AppTracerEvent } from "../types/events";
import { buildSpanForest } from "../utils/buildSpanTree";
import { normalizeEvent } from "../utils/normalizeEvent";

function base(e: Partial<TracerEvent>): AppTracerEvent {
  // minimal valid BaseEvent fields from tracer types:
  const raw = {
    ts: e.ts ?? "2024-01-01T00:00:00.000Z",
    sessionId: e.sessionId ?? "s1",
    level: e.level ?? "info",
    ctx: e.ctx ?? { traceId: "t1", spanId: "x" },
    type: e.type ?? "message",
    provider: e.provider,
    model: e.model,
    ...e,
  } as TracerEvent;

  return normalizeEvent(raw);
}

describe("buildSpanForest", () => {
  it("nests child spans under parents and sorts by ts", () => {
    const events: AppTracerEvent[] = [
      base({
        type: "span",
        ctx: { traceId: "t1", spanId: "root" },
        ts: "2024-01-01T10:00:00.000Z",
        provider: "openai",
        model: "gpt-4o-mini",
        operation: "root",
        durationMs: 1200,
        status: "ok",
      }),
      base({
        type: "span",
        ctx: { traceId: "t1", spanId: "child-a", parentSpanId: "root" },
        ts: "2024-01-01T10:00:00.100Z",
        operation: "child-a",
        durationMs: 800,
      }),
      base({
        type: "span",
        ctx: { traceId: "t1", spanId: "child-b", parentSpanId: "root" },
        ts: "2024-01-01T10:00:00.090Z",
        operation: "child-b",
        durationMs: 300,
      }),
    ];

    const { roots, orphans } = buildSpanForest(events);

    expect(orphans.length).toBe(0);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe("root");
    expect(roots[0].children.map((c) => c.id)).toEqual(["child-b", "child-a"]); // sorted by ts
  });

  it("attaches non-span events to their parent span as events", () => {
    const events: AppTracerEvent[] = [
      base({
        type: "span",
        ctx: { traceId: "t1", spanId: "root" },
        ts: "2024-01-01T10:00:00.000Z",
        operation: "root",
        durationMs: 1,
      }),
      base({
        type: "message",
        ctx: { traceId: "t1", spanId: "m1", parentSpanId: "root" },
        ts: "2024-01-01T10:00:00.050Z",
        role: "user",
        content: "hello",
        format: "text",
      }),
      base({
        type: "tool_call",
        ctx: { traceId: "t1", spanId: "c1", parentSpanId: "root" },
        ts: "2024-01-01T10:00:00.060Z",
        tool: "search",
        input: { q: "vectordb" },
      }),
    ];

    const { roots, orphans } = buildSpanForest(events);
    expect(orphans.length).toBe(0);
    expect(roots).toHaveLength(1);
    expect(roots[0].events).toHaveLength(2);
    expect(roots[0].events.map((e) => e.type)).toEqual([
      "message",
      "tool_call",
    ]);
  });

  it("keeps top-level non-span events as orphans when no parent span", () => {
    const events: AppTracerEvent[] = [
      base({
        type: "message",
        ctx: { traceId: "t1", spanId: "m1" },
        ts: "2024-01-01T10:00:00.000Z",
        role: "system",
        content: "hi",
        format: "text",
      }),
      base({
        type: "span",
        ctx: { traceId: "t1", spanId: "root" },
        ts: "2024-01-01T10:00:01.000Z",
        operation: "root",
        durationMs: 1,
      }),
    ];

    const { roots, orphans } = buildSpanForest(events);
    expect(roots).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].type).toBe("message");
  });
});
