import type { CSSProperties } from "react";

import type { TracerEvent } from "@accordkit/core";

interface EventListProps {
  events: TracerEvent[];
}

export function EventList({ events }: EventListProps) {
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
      {events.map((event, index) => (
        <div className="event-row" key={`${event.ts}-${index}`}>
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
          </div>
        </div>
      ))}
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
