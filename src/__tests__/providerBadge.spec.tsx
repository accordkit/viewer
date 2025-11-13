import { TracerEvent } from "@accordkit/tracer";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EventList } from "../components/EventList";
import { PluginProvider } from "../plugins";
import { AppTracerEvent } from "../types/events";
import { normalizeEvent } from "../utils/normalizeEvent";

const longModel =
  "provider-x-super-long-model-name-with-many-segments-0123456789";

function ev(p: Partial<TracerEvent>): AppTracerEvent {
  const raw = {
    ts: "2024-01-01T00:00:00.000Z",
    sessionId: "s",
    level: "info",
    ctx: { traceId: "t", spanId: "x" },
    type: "message",
    ...p,
  } as TracerEvent;

  return normalizeEvent(raw);
}

describe("Provider/Model badge", () => {
  it("renders badge and title with long model", () => {
    render(
      <PluginProvider>
        <EventList
          events={[
            ev({
              provider: "openai",
              model: longModel,
              role: "user",
              content: "hi",
              format: "text",
            }),
          ]}
          bottomRef={{ current: null }}
          onListApiChange={() => {}}
        />
      </PluginProvider>
    );
    // The badge’s title includes "provider — model"
    expect(screen.getByTitle(`openai — ${longModel}`)).toBeInTheDocument();
  });
});
