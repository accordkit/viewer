import {
  type AppTracerEvent,
  type AppSpanEvent,
  type SpanEventStatus,
} from "../types/events";

import type { TracerEvent } from "@accordkit/tracer";

/**
 * Validates and normalizes a raw `TracerEvent` from an ingest source
 * into our type-safe `AppTracerEvent`.
 *
 * This function is the "boundary" that ensures our internal
 * app state is always clean.
 */
export function normalizeEvent(event: TracerEvent): AppTracerEvent {
  if (event.type !== "span") {
    // Not a span, so just pass it through.
    // It already matches the `Exclude<TracerEvent, { type: "span" }>` part of our union.
    return event as AppTracerEvent;
  }

  // It's a span. We need to validate its status.
  const rawStatus = event.status as SpanEventStatus | undefined | string;
  let cleanStatus: SpanEventStatus;

  switch (rawStatus) {
    case "ok":
    case "error":
    case "streaming":
      cleanStatus = rawStatus;
      break;
    default:
      // If status is missing, "complete", or anything else,
      // default it to 'ok' for safe rendering.
      cleanStatus = "ok";
  }

  // Re-cast the event to our AppSpanEvent type with the guaranteed-safe status.
  return {
    ...event,
    status: cleanStatus,
  } as AppSpanEvent;
}