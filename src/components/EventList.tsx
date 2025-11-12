import { useMemo, type CSSProperties } from "react";

import { EventExtrasSlot } from "../plugins";
import {
  buildSpanTree,
  buildSpanForest,
  type SpanNode,
} from "../utils/buildSpanTree";

import type { AppTracerEvent } from "../types/events";

interface EventListProps {
  events: AppTracerEvent[];
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#5c4ee5",
  google: "#ea4335",
  azure: "#0078d4",
};

export function EventList({ events }: EventListProps) {
  const { roots, orphans } = useMemo(() => buildSpanForest(events), [events]);

  if (events.length === 0) {
    return (
      <div className="panel">
        <div
          className="panel-body"
          style={{ textAlign: "center", color: "rgba(148,163,184,0.8)" }}
        >
          <p>No events match the current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list" data-testid="event-list">
      {/* Top-level non-span events (orphans) */}
      {orphans.map((e, i) => (
        <EventRow key={`orphan-${e.ts}-${i}`} event={e} depth={0} />
      ))}
      {/* Span tree roots */}
      {roots.map((node) => (
        <SpanNodeView key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

/**
 * Recursive component to render a span and its children.
 * This component itself renders *nothing*, it just maps nodes to EventRows.
 */
function SpanNodeView({ node, depth }: { node: SpanNode; depth: number }) {
  return (
    <>
      {/* Render the span row itself at the current depth */}
      <EventRow event={node.event} depth={depth} />

      {/* Render attached events, indented one level deeper */}
      {node.events.map((e, i) => (
        <EventRow key={`evt-${node.id}-${i}`} event={e} depth={depth + 1} />
      ))}

      {/* Render children, indented one level deeper */}
      {node.children.map((child) => (
        <SpanNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

/**
 * Renders a single event row, with indentation.
 */
function EventRow({ event, depth }: { event: AppTracerEvent; depth: number }) {
  const indentStyle: CSSProperties = {
    // Apply the margin to the row itself
    marginLeft: depth * 24, // 24px per level
    // Border to visualize the hierarchy
    borderLeft: depth > 0 ? "2px solid rgba(148, 163, 184, 0.1)" : "none",
    paddingLeft: depth > 0 ? "1.1rem" : "1.2rem",
  };

  return (
    <div className="event-row" style={indentStyle}>
      {/* Metadata Column */}
      <div>
        <div className="badge" data-type={event.type}>
          {event.type}
        </div>
        <div
          style={{
            marginTop: "0.45rem",
            fontSize: "0.78rem",
            color: "rgba(148,163,184,0.85)",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            alignItems: "flex-start", // Left-align metadata
            minWidth: 0,
          }}
        >
          {/* provider/model badge */}
          {event.provider ? (
            <ProviderBadge provider={event.provider} model={event.model} />
          ) : (
            <span
              style={{
                fontSize: "0.78rem",
                color: "rgba(148,163,184,0.85)",
              }}
            >
              unknown
            </span>
          )}
          {/* Timestamp */}
          <div>{formatTimestamp(event.ts)}</div>
        </div>
      </div>
      {/* End Metadata Column --- */}

      {/* Body Column */}
      <div style={{ minWidth: 0 }}>
        <h3
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1rem",
            color: "#f8fafc",
          }}
        >
          {/* Show operation for spans, model for others, fallback to spanId */}
          {event.type === "span"
            ? event.operation
            : (event.model ?? event.ctx.spanId)}
        </h3>
        <EventBody event={event} />

        {/* plugin slot: render extra per-event content below the body */}
        <div style={{ marginTop: "0.6rem" }}>
          <EventExtrasSlot event={event} />
        </div>
      </div>
      {/* End Body Column */}
    </div>
  );
}

function EventBody({ event }: { event: AppTracerEvent }) {
  switch (event.type) {
    case "message":
      return (
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(148,163,184,0.8)",
              marginBottom: "0.4rem",
            }}
          >
            {event.role}
          </div>
          <p style={messageStyle}>{event.content}</p>
        </div>
      );
    case "tool_call":
      return (
        <div>
          <div
            style={{
              fontSize: "0.85rem",
              marginBottom: "0.3rem",
              color: "#bae6fd",
            }}
          >
            Invoked: <strong>{event.tool}</strong>
          </div>
          <CodeBlock value={event.input} />
        </div>
      );
    case "tool_result":
      return (
        <div>
          <div
            style={{
              fontSize: "0.85rem",
              marginBottom: "0.3rem",
              color: "#fcd34d",
            }}
          >
            {event.ok ? "Result" : "Error"} from <strong>{event.tool}</strong>
            {event.latencyMs != null ? ` (${event.latencyMs} ms)` : ""}
          </div>
          <CodeBlock value={event.output} />
        </div>
      );
    case "usage":
      return (
        <ul
          style={{
            margin: 0,
            paddingLeft: "1rem",
            color: "#e2e8f0",
            fontSize: "0.9rem",
          }}
        >
          <li>Prompt tokens: {event.inputTokens ?? "—"}</li>
          <li>Completion tokens: {event.outputTokens ?? "—"}</li>
          {event.cost != null && (
            <li>Estimated cost: ${event.cost.toFixed(6)}</li>
          )}
        </ul>
      );
    case "span":
      return (
        <div>
          <div style={{ fontSize: "0.9rem", color: "#f9a8d4" }}>
            {event.durationMs} ms · {event.status}
          </div>
          {event.attrs && <CodeBlock value={event.attrs} collapsed />}
        </div>
      );
    default:
      // This default case handles any event types we haven't explicitly formatted
      return <CodeBlock value={event} collapsed />;
  }
}

function ProviderBadge({
  provider,
  model,
}: {
  provider?: string;
  model?: string;
}) {
  const p = (provider ?? "unknown").toLowerCase();
  const bg = PROVIDER_COLORS[p] ?? "#64748b"; // slate-500 fallback
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.15rem 0.5rem",
        borderRadius: "0.5rem",
        background: bg,
        color: "white",
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.1,
        maxWidth: "100%",
        minWidth: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={`${provider ?? "unknown"} — ${model ?? "—"}`}
    >
      <span style={{ flex: "0 0 auto" }}>{provider ?? "unknown"}</span>
      <span
        style={{
          opacity: 0.9,
          flex: "1 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        — {model ?? "—"}
      </span>
    </span>
  );
}

function CodeBlock({
  value,
  collapsed,
}: {
  value: unknown;
  collapsed?: boolean;
}) {
  if (value == null) return null;
  const json =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre style={codeBlockStyle(collapsed)}>{json}</pre>;
}

function formatTimestamp(ts?: string) {
  if (!ts) return "Unknown time";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  // Format as HH:MM:SS.mmm
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

const messageStyle: CSSProperties = {
  margin: 0,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  color: "#e2e8f0",
  overflowWrap: "anywhere",
};

const codeBlockStyle = (collapsed?: boolean): CSSProperties => ({
  margin: 0,
  marginTop: "0.4rem",
  padding: "0.6rem 0.8rem",
  background: "rgba(15,23,42,0.8)",
  borderRadius: "10px",
  border: "1px solid rgba(148,163,184,0.14)",
  maxHeight: collapsed ? "8rem" : "20rem",
  overflow: "auto",
  fontSize: "0.78rem",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});
