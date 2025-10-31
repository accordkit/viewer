import { EventList } from "./EventList";

import type { TracerEvent } from "@accordkit/tracer";
import type { RefObject } from "react";

interface EventsPanelProps {
  events: TracerEvent[];
  bottomRef: RefObject<HTMLDivElement | null>;
}

export function EventsPanel({ events, bottomRef }: EventsPanelProps) {
  return (
    <div className="panel" style={{ marginBottom: "1.5rem" }}>
      <div className="panel-body">
        <EventList events={events} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
