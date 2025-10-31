import { MessageEvent } from "@accordkit/tracer";
import { render, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTraceData } from "../hooks/useTraceData";

function renderTraceDataHook() {
  const result: { current: ReturnType<typeof useTraceData> | null } = {
    current: null,
  };

  function Harness() {
    result.current = useTraceData();
    return null;
  }

  render(<Harness />);
  if (!result.current) {
    throw new Error("Hook did not initialize");
  }
  return result;
}

describe("useTraceData", () => {
  it("loads the sample trace", async () => {
    const result = renderTraceDataHook();

    await act(async () => {
      result.current!.loadSampleTrace();
    });

    await waitFor(() => {
      expect(result.current!.events.length).toBeGreaterThan(0);
    });
    expect(result.current!.fileName).toBe("sample-trace.jsonl");
    expect(result.current!.errors).toHaveLength(0);
  });

  it("parses uploaded files and captures errors", async () => {
    const result = renderTraceDataHook();
    const validLine = JSON.stringify({
      type: "message",
      ts: "2024-01-01T00:00:00.000Z",
      ctx: { traceId: "t1", spanId: "s1" },
      sessionId: "demo",
      level: "info",
      content: "hello",
      format: "text",
    });
    const invalidLine = "{ not json }";
    const file = {
      name: "upload.jsonl",
      text: () => Promise.resolve(`${validLine}\n${invalidLine}`),
    } as File;

    await act(async () => {
      await result.current!.handleFiles([file]);
    });

    await waitFor(() => {
      expect(result.current!.events).toHaveLength(1);
    });
    expect(result.current!.errors).toHaveLength(1);
    expect(result.current!.fileName).toBe("upload.jsonl");
  });

  it("caps appended events to the ring buffer size", async () => {
    const result = renderTraceDataHook();
    const makeEvent = (index: number): MessageEvent => ({
      type: "message" as const,
      ts: new Date(2024, 0, 1, 0, 0, index).toISOString(),
      ctx: { traceId: "trace", spanId: `span-${index}` },
      sessionId: "demo",
      level: "info",
      role: "user",
      content: `event-${index}`,
      format: "text",
    });

    const MAX_EVENTS = 10_000;
    const incoming = Array.from({ length: MAX_EVENTS + 25 }, (_, idx) =>
      makeEvent(idx)
    );

    await act(async () => {
      result.current!.appendEvents(incoming);
    });

    await waitFor(() => {
      expect(result.current!.events).toHaveLength(MAX_EVENTS);
    });
    expect((result.current!.events[0] as MessageEvent).content).toBe(
      "event-25"
    );
  });
});
