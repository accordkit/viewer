import type { AppTracerEvent, AppSpanEvent } from "../types/events";

export interface SpanNode {
  id: string;
  event: AppSpanEvent;
  children: SpanNode[];
  events: AppTracerEvent[];
}

/** Type guard for span events. */
function isSpanEvent(e: AppTracerEvent): e is AppSpanEvent {
  return e.type === "span";
}

/** Safely read a span's id. Falls back to a stable synthetic id. */
function getSpanId(e: AppSpanEvent): string {
  return e.ctx.spanId;
}

/** Safely read a span's parent id, if present. */
function getParentSpanId(e: AppSpanEvent): string | undefined {
  return e.ctx.parentSpanId;
}

/** Normalize timestamps to numbers for sorting. */
function tsNumber(e: AppTracerEvent): number {
  const n = Date.parse(e.ts);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Builds a tree of span events based on parent-child relationships.
 * - Only span events become tree nodes.
 * - Children are sorted by timestamp.
 * - Roots are spans without a valid parent.
 */
export function buildSpanTree(events: AppTracerEvent[]): SpanNode[] {
  const nodes = new Map<string, SpanNode>();

  // First pass: create nodes for span events
  for (const e of events) {
    if (isSpanEvent(e)) {
      const id = getSpanId(e);
      nodes.set(id, { id, event: e, children: [], events: [] });
    }
  }

  // Second pass: link children to parents
  const roots: SpanNode[] = [];
  for (const node of nodes.values()) {
    const parentId = getParentSpanId(node.event);
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Attach NON-SPAN events to their parent span (by ctx.parentSpanId)
  for (const e of events) {
    if (isSpanEvent(e)) continue;
    const parentId = e.ctx?.parentSpanId;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.events.push(e);
    }
  }

  // Sort children and roots by timestamp (numeric)
  for (const n of nodes.values()) {
    n.children.sort((a, b) => tsNumber(a.event) - tsNumber(b.event));
    n.events.sort((a, b) => tsNumber(a) - tsNumber(b));
  }
  roots.sort((a, b) => tsNumber(a.event) - tsNumber(b.event));

  return roots;
}

/** Also return top-level non-span events that don't belong to any span. */
export function buildSpanForest(events: AppTracerEvent[]): {
  roots: SpanNode[];
  orphans: AppTracerEvent[];
} {
  const roots = buildSpanTree(events);
  const spanIds = new Set<string>();
  const parentIds = new Set<string>();
  // collect ids to determine orphans
  const walk = (n: SpanNode) => {
    spanIds.add(n.id);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  roots.forEach((n) => {
    n.events.forEach((e) => {
      if (e.ctx.parentSpanId) {
        parentIds.add(e.ctx.parentSpanId);
      }
    });
  });
  const orphans = events.filter(
    (e) =>
      e.type !== "span" &&
      (!e.ctx?.parentSpanId || !spanIds.has(e.ctx.parentSpanId))
  );

  // sort for stable rendering
  orphans.sort((a, b) => tsNumber(a) - tsNumber(b));
  return { roots, orphans };
}
