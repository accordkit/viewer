import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EventList } from "../components/EventList";
import { PluginProvider } from "../plugins";

import type { TracerEvent } from "@accordkit/tracer";

function ev(partial: Partial<TracerEvent>): TracerEvent {
  return {
    ts: partial.ts ?? "2024-01-01T00:00:00.000Z",
    sessionId: partial.sessionId ?? "s1",
    level: partial.level ?? "info",
    ctx: partial.ctx ?? { traceId: "t1", spanId: "x" },
    type: partial.type ?? "message",
    provider: partial.provider,
    model: partial.model,
    ...partial,
  } as TracerEvent;
}

describe("PluginProvider + EventExtrasSlot", () => {
  it("renders EventExtras content under each event", () => {
    const events: TracerEvent[] = [
      ev({
        type: "message",
        role: "user",
        content: "hi",
        format: "text",
      }),
      ev({
        type: "span",
        operation: "op",
        durationMs: 10,
      }),
    ];

    const Extras = ({ event }: { event: TracerEvent }) => (
      <div data-testid={`extras-${event.type}`}>extras: {event.type}</div>
    );

    render(
      <PluginProvider slots={{ EventExtras: Extras }}>
        <EventList events={events} />
      </PluginProvider>,
    );

    expect(screen.getByTestId("extras-message")).toBeInTheDocument();
    expect(screen.getByTestId("extras-span")).toBeInTheDocument();
  });
});
