import { useMemo, type CSSProperties } from "react";

import { EventExtrasSlot } from "../plugins";
import {
  buildSpanTree,
  buildSpanForest,
  type SpanNode,
} from "../utils/buildSpanTree";

import type { TracerEvent } from "@accordkit/tracer";

interface EventListProps {
  events: TracerEvent[];
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
    <div className="event-list">
      {/* Top-level non-span events */}
      {orphans.map((e, i) => (
        <EventRow key={`orphan-${e.ts}-${i}`} event={e} />
      ))}
      {/* Span tree */}
      {roots.map((node) => (
        <SpanNodeView key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function SpanNodeView({ node, depth }: { node: SpanNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <EventRow event={node.event} />
      {/* events attached to this span */}
      {node.events.map((e, i) => (
        <div key={`evt-${node.id}-${i}`} style={{ marginLeft: 16 }}>
          <EventRow event={e} />
        </div>
      ))}
      {/* child spans */}
      {node.children.map((child) => (
        <SpanNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function EventRow({ event }: { event: TracerEvent }) {
  return (
    <div className="event-row">
      <div>
        <div className="badge" data-type={event.type}>
          {event.type}
        </div>
        <div
          style={{
            marginTop: "0.45rem",
            fontSize: "0.78rem",
            color: "rgba(148,163,184,0.85)",
          }}
        >
          <strong>{event.provider ?? "unknown"}</strong>
          <div>{formatTimestamp(event.ts)}</div>
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: "rgba(148,163,184,0.85)",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            alignItems: "center",
            textAlign: "center",
            minWidth: 0,
          }}
        >
          {/* provider/model badge */}
          {event.provider ? (
            <ProviderBadge provider={event.provider} model={event.model} />
          ) : null}
          <div>{formatTimestamp(event.ts)}</div>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <h3
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1rem",
            color: "#f8fafc",
          }}
        >
          {event.model ?? event.ctx.spanId}
        </h3>
        <EventBody event={event} />

        {/* plugin slot: render extra per-event content below the body */}
        <div style={{ marginTop: "0.6rem" }}>
          <EventExtrasSlot event={event} />
        </div>
      </div>
    </div>
  );
}

function EventBody({ event }: { event: TracerEvent }) {
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
            {event.ok ? "Result" : "Error"} from <strong>{event.tool}</strong> (
            {event.latencyMs} ms)
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
            {event.operation} · {event.durationMs} ms · {event.status}
          </div>
          {event.attrs && <CodeBlock value={event.attrs} collapsed />}
        </div>
      );
    default:
      return <pre style={{ margin: 0 }}>{JSON.stringify(event, null, 2)}</pre>;
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
  return date.toLocaleString();
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
