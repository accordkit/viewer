import type { AppTracerEvent } from "../types/events";
import type { ToolResultEvent } from "@accordkit/tracer";

const SLOW_MS = 1000;
const MAX_BAR_MS = 3000;

export function LatencyBarPlugin({ event }: { event: AppTracerEvent }) {
  const dur = getDuration(event);
  const usage = getUsage(event);

  const showLatency = dur != null;
  const showUsage =
    usage.totalTokens != null ||
    usage.inputTokens != null ||
    usage.outputTokens != null ||
    usage.costUSD != null;

  if (!showLatency && !showUsage) return null;

  const pct = dur ? Math.min(1, dur / MAX_BAR_MS) : 0;

  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      {showLatency && <LatencyBar duration={dur} percent={pct} />}
      {showUsage && <UsageChips usage={usage} />}
    </div>
  );
}

function getDuration(event: AppTracerEvent): number | undefined {
  if (event.type === "span") return event.durationMs;
  if (
    "latencyMs" in event &&
    typeof (event as ToolResultEvent).latencyMs === "number"
  )
    return (event as ToolResultEvent).latencyMs;
  return undefined;
}

interface UsageData {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUSD?: number;
}

function getUsage(event: AppTracerEvent): UsageData {
  const usage = (event as Partial<{ usage: UsageData }>).usage ?? {};
  return {
    totalTokens: usage.totalTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUSD: usage.costUSD,
  };
}

function LatencyBar({
  duration,
  percent,
}: {
  duration: number;
  percent: number;
}) {
  const slow = duration >= SLOW_MS;
  const color =
    duration >= SLOW_MS ? "#ef4444" : duration > 500 ? "#f59e0b" : "#22c55e";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <strong style={{ fontSize: "0.85rem" }}>{duration} ms</strong>
        {slow && (
          <span
            style={{
              fontSize: "0.7rem",
              padding: "0.1rem 0.4rem",
              borderRadius: "0.4rem",
              background: "rgba(239,68,68,0.18)",
              color: "#fecaca",
            }}
          >
            slow
          </span>
        )}
      </div>
      <div
        style={{
          height: 8,
          marginTop: 6,
          borderRadius: 999,
          background: "rgba(148,163,184,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent * 100}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function UsageChips({ usage }: { usage: UsageData }) {
  const chip = (label: string, value: string | number) => (
    <span
      key={label}
      style={{
        fontSize: "0.75rem",
        padding: "0.15rem 0.5rem",
        borderRadius: "0.5rem",
        background: "rgba(148,163,184,0.12)",
        color: "rgba(226,232,240,0.95)",
        border: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      {label}: {value}
    </span>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
      {usage.totalTokens != null && chip("tokens", usage.totalTokens)}
      {usage.inputTokens != null && chip("in", usage.inputTokens)}
      {usage.outputTokens != null && chip("out", usage.outputTokens)}
      {usage.costUSD != null && chip("USD", `$${usage.costUSD.toFixed(4)}`)}
    </div>
  );
}
