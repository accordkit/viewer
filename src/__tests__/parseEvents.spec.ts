import { describe, expect, it } from "vitest";

import { parseJsonLines, sortEvents } from "../utils/parseEvents";

import type { TracerEvent } from "@accordkit/tracer";

const sampleEvent: TracerEvent = {
  ts: "2024-01-01T00:00:00.000Z",
  sessionId: "sess",
  level: "info",
  ctx: { traceId: "tr", spanId: "sp" },
  type: "message",
  role: "user",
  content: "hello",
};

describe("parseJsonLines", () => {
  it("parses newline-delimited JSON and returns events", () => {
    const jsonl = [
      sampleEvent,
      { ...sampleEvent, ts: "2024-01-01T00:00:01.000Z" },
    ]
      .map((event) => JSON.stringify(event))
      .join("\n");

    const result = parseJsonLines(jsonl);

    expect(result.events).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.events[0].ts).toBe(sampleEvent.ts);
  });

  it("collects parse errors but continues", () => {
    const jsonl = `${JSON.stringify(sampleEvent)}\n{invalid json}\n${JSON.stringify(
      {
        ...sampleEvent,
        ts: "2024-01-01T00:00:02.000Z",
      }
    )}`;

    const result = parseJsonLines(jsonl);

    expect(result.events).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ line: 2 });
  });
});

describe("sortEvents", () => {
  it("orders events chronologically by timestamp", () => {
    const reversed = [
      { ...sampleEvent, ts: "2024-01-01T00:00:02.000Z" },
      { ...sampleEvent, ts: "2024-01-01T00:00:01.000Z" },
      sampleEvent,
    ];

    const sorted = sortEvents(reversed);

    expect(sorted[0].ts).toBe(sampleEvent.ts);
    expect(sorted[2].ts).toBe("2024-01-01T00:00:02.000Z");
  });
});
