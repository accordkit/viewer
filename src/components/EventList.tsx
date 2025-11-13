import {
  useEffect,
  useMemo,
  useState,
  useRef,
  memo,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  List,
  useDynamicRowHeight,
  type RowComponentProps,
} from "react-window";

import { EventExtrasSlot } from "../plugins";
import { buildSpanForest, type SpanNode } from "../utils/buildSpanTree";

import type { EventListHandler } from "./EventListHandle";
import type { AppTracerEvent } from "../types/events";

interface EventListProps {
  events: AppTracerEvent[];
  bottomRef: RefObject<HTMLDivElement | null>;
  onListApiChange?: (api: EventListHandler | null) => void;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#5c4ee5",
  google: "#ea4335",
  azure: "#0078d4",
};

const ROW_GAP_PX = 12;
const ESTIMATED_ROW_HEIGHT = 220;
const ESTIMATED_ROW_SIZE = ESTIMATED_ROW_HEIGHT + ROW_GAP_PX;

interface FlattenedRow {
  key: string;
  depth: number;
  event: AppTracerEvent;
}

export function EventList({
  events,
  bottomRef,
  onListApiChange,
}: EventListProps) {
  const { roots, orphans } = useMemo(() => buildSpanForest(events), [events]);
  const flattenedRows = useMemo<FlattenedRow[]>(
    () => flattenEventRows({ roots, orphans }),
    [roots, orphans]
  );
  const rowData = useMemo(
    () => ({
      rows: flattenedRows,
      rowCount: flattenedRows.length + 1, // sentinel row
    }),
    [flattenedRows]
  );
  const [listHeight, setListHeight] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 600
  );
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: ESTIMATED_ROW_SIZE,
    key: flattenedRows.length,
  });
  const listRef = useRef<EventListHandler | null>(null);

  useEffect(() => {
    onListApiChange?.(listRef.current);
    return () => onListApiChange?.(null);
  }, [onListApiChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setListHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    <List
      listRef={listRef}
      className="event-list"
      data-testid="event-list"
      rowCount={rowData.rowCount}
      rowHeight={dynamicRowHeight}
      rowComponent={VirtualizedRow}
      rowProps={{ ...rowData, sentinelRef: bottomRef }}
      overscanCount={12}
      defaultHeight={listHeight}
      style={{ height: listHeight, width: "100%" }}
    />
  );
}

type VirtualizedRowProps = {
  rows: FlattenedRow[];
  rowCount: number;
  sentinelRef: RefObject<HTMLDivElement | null>;
};

function VirtualizedRow({
  ariaAttributes,
  index,
  style,
  rows,
  rowCount,
  sentinelRef,
}: RowComponentProps<VirtualizedRowProps>) {
  const isSentinel = index === rowCount - 1;
  if (isSentinel) {
    return (
      <div
        {...ariaAttributes}
        ref={sentinelRef}
        style={{ ...style, paddingBottom: 0, height: 1 }}
      />
    );
  }
  const row = rows[index];
  if (!row) {
    return <div {...ariaAttributes} style={style} />;
  }
  return (
    <div
      {...ariaAttributes}
      style={{
        ...style,
        paddingBottom: ROW_GAP_PX,
      }}
    >
      <EventRow event={row.event} depth={row.depth} />
    </div>
  );
}

/**
 * Renders a single event row, with indentation.
 */
interface EventRowProps {
  event: AppTracerEvent;
  depth: number;
}

function EventRowInner({ event, depth }: EventRowProps) {
  const indentStyle = useMemo<CSSProperties>(
    () => ({
      // Apply the margin to the row itself
      marginLeft: depth * 24, // 24px per level
      // Border to visualize the hierarchy
      borderLeft: depth > 0 ? "2px solid rgba(148, 163, 184, 0.1)" : "none",
      paddingLeft: depth > 0 ? "1.1rem" : "1.2rem",
    }),
    [depth]
  );

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

const EventRow = memo(EventRowInner);

function EventBodyInner({ event }: { event: AppTracerEvent }) {
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

const EventBody = memo(EventBodyInner);

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

const CodeBlock = memo(function CodeBlock({
  value,
  collapsed,
}: {
  value: unknown;
  collapsed?: boolean;
}) {
  // Memoize expensive stringification so repeated renders don't recompute it
  const json = useMemo(() => {
    if (value == null) return null;
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }, [value]);

  if (json == null) return null;
  return <pre style={codeBlockStyle(collapsed)}>{json}</pre>;
});

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

function flattenEventRows({
  roots,
  orphans,
}: {
  roots: SpanNode[];
  orphans: AppTracerEvent[];
}): FlattenedRow[] {
  const rows: FlattenedRow[] = [];

  orphans.forEach((event, index) => {
    rows.push({
      key: `orphan-${event.ts ?? "ts"}-${index}`,
      depth: 0,
      event,
    });
  });

  const visit = (node: SpanNode, depth: number) => {
    rows.push({ key: `span-${node.id}`, depth, event: node.event });
    node.events.forEach((event, index) => {
      rows.push({
        key: `evt-${node.id}-${event.ts ?? "ts"}-${index}`,
        depth: depth + 1,
        event,
      });
    });
    node.children.forEach((child) => visit(child, depth + 1));
  };

  roots.forEach((node) => visit(node, 0));

  return rows;
}
