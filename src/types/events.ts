import type { TracerEvent } from "@accordkit/tracer";

/**
 * Define application's set of span statuses,
 * including 'streaming' for live updates.
 */
export type SpanEventStatus = "ok" | "error" | "streaming";

/**
 * Create a specific, type-safe SpanEvent for our app.
 * Omits the original 'status' from the package and replace
 * it with our more specific `SpanEventStatus`.
 */
export type AppSpanEvent = Omit<
  Extract<TracerEvent, { type: "span" }>,
  "status"
> & {
  status: SpanEventStatus;
};

/**
 * App's main event type.
 * This is a union of custom AppSpanEvent and all other
 * event types from the tracer package.
 */
export type AppTracerEvent =
  | AppSpanEvent
  | Exclude<TracerEvent, { type: "span" }>;
