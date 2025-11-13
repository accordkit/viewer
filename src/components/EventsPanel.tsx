import { EventList } from "./EventList";

import type { EventListHandler } from "./EventListHandle";
import type { AppTracerEvent } from "../types/events";
import type { RefObject } from "react";

interface EventsPanelProps {
  events: AppTracerEvent[];
  bottomRef: RefObject<HTMLDivElement | null>;
  onListApiChange?: (api: EventListHandler | null) => void;
}

export function EventsPanel({
  events,
  bottomRef,
  onListApiChange,
}: EventsPanelProps) {
  return (
    <div className="panel" style={{ marginBottom: "1.5rem" }}>
      <div className="panel-body">
        <EventList
          events={events}
          bottomRef={bottomRef}
          onListApiChange={onListApiChange}
        />
      </div>
    </div>
  );
}
