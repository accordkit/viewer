import { describe, it, expect } from "vitest";

import { normalizeEvent } from "../utils/normalizeEvent";

import type { AppSpanEvent } from "../types/events";
import type { TracerEvent } from "@accordkit/tracer";

/**
 * Helper to create raw `TracerEvent` objects, mimicking data
 * coming from an ingestor (like `parseJsonLines` or `liveClient`).
 */
function createRawEvent(partial: Partial<TracerEvent>): TracerEvent {
  return {
    ts: "2024-01-01T00:00:00.000Z",
    sessionId: "s1",
    level: "info",
    ctx: { traceId: "t1", spanId: "sp1" },
    type: "message",
    role: "user",
    content: "hello",
    format: "text",
    ...partial,
  } as TracerEvent;
}

/**
 * Helper to create a raw span event, specifically to test the 'status' field.
 * We use 'as any' here *intentionally* to simulate invalid data
 * that might come from a file or API.
 */
function createRawSpan(status: string | undefined | null): TracerEvent {
  return createRawEvent({
    type: "span",
    operation: "test-op",
    durationMs: 100,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: status as any, // Simulating bad data
  });
}

describe("normalizeEvent", () => {
  it("passes non-span events (e.g., message) through unchanged", () => {
    const messageEvent = createRawEvent({ type: "message" });
    const normalized = normalizeEvent(messageEvent);
    // Should be identical to the input
    expect(normalized).toEqual(messageEvent);
  });

  it("passes tool_call events through unchanged", () => {
    const toolCallEvent = createRawEvent({ type: "tool_call" });
    const normalized = normalizeEvent(toolCallEvent);
    expect(normalized).toEqual(toolCallEvent);
  });

  it("keeps valid 'ok' status for spans", () => {
    const span = createRawSpan("ok");
    const normalized = normalizeEvent(span) as AppSpanEvent;
    expect(normalized.status).toBe("ok");
  });

  it("keeps valid 'error' status for spans", () => {
    const span = createRawSpan("error");
    const normalized = normalizeEvent(span) as AppSpanEvent;
    expect(normalized.status).toBe("error");
  });

  it("keeps valid 'streaming' status for spans", () => {
    const span = createRawSpan("streaming");
    const normalized = normalizeEvent(span) as AppSpanEvent;
    expect(normalized.status).toBe("streaming");
  });

  it("defaults 'undefined' status to 'ok' for spans", () => {
    const span = createRawSpan(undefined);
    const normalized = normalizeEvent(span) as AppSpanEvent;
    expect(normalized.status).toBe("ok");
  });

  it("defaults 'null' status to 'ok' for spans", () => {
    const span = createRawSpan(null);
    const normalized = normalizeEvent(span) as AppSpanEvent;
    expect(normalized.status).toBe("ok");
  });

  it("defaults an unknown string status (e.g., 'completed') to 'ok'", () => {
    const span = createRawSpan("completed");
    const normalized = normalizeEvent(span) as AppSpanEvent;
    expect(normalized.status).toBe("ok");
  });
});
