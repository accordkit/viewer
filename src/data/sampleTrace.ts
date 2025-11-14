import type { AppTracerEvent } from "../types/events";

// Generate a realistic, variable-sized sample trace. The generator chooses
// between a normal-sized trace and a "very big" trace randomly. The output
// contains spans, nested child spans, messages, tool calls and results,
// and some orphan top-level events to mimic telemetry from a large project.

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let idCounter = 1;
function nextId(prefix = "id") {
  return `${prefix}-${idCounter++}`;
}

const PROVIDERS = ["openai", "anthropic", "google", "azure"];
const MODELS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
  anthropic: ["claude-2", "claude-1.3"],
  google: ["gemini-mini", "paLM-2"],
  azure: ["azure-gpt"],
};

const LEVELS = ["info", "debug", "error", "warn"]; // telemetry severity
const ROLES = ["user", "assistant", "system"];

function nowIso(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function makeSpan(opts: {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  provider: string;
  model: string;
  operation?: string;
  durationMs?: number;
  status?: string;
  tsMs: number;
}): AppTracerEvent {
  return {
    type: "span",
    ts: nowIso(opts.tsMs),
    sessionId: "demo",
    level: pick(LEVELS),
    ctx: {
      traceId: opts.traceId,
      spanId: opts.spanId,
      ...(opts.parentSpanId ? { parentSpanId: opts.parentSpanId } : {}),
    },
    provider: opts.provider,
    model: opts.model,
    operation: opts.operation ?? "op:unknown",
    durationMs: opts.durationMs ?? randInt(5, 2000),
    status: opts.status ?? "ok",
  } as AppTracerEvent;
}

function makeMessage(opts: {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  role?: string;
  content?: string;
  tsMs: number;
}): AppTracerEvent {
  return {
    type: "message",
    ts: nowIso(opts.tsMs),
    sessionId: "demo",
    level: pick(LEVELS),
    ctx: {
      traceId: opts.traceId,
      spanId: opts.spanId,
      ...(opts.parentSpanId ? { parentSpanId: opts.parentSpanId } : {}),
    },
    provider: pick(PROVIDERS),
    model: "",
    role: opts.role ?? pick(ROLES),
    content:
      opts.content ??
      pick([
        "Hello",
        "Ping",
        "Summarize this",
        "What is the status?",
        "Run query",
      ]),
    format: "text",
  } as AppTracerEvent;
}

function makeToolCall(opts: {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  tool?: string;
  input?: unknown;
  tsMs: number;
}): AppTracerEvent {
  return {
    type: "tool_call",
    ts: nowIso(opts.tsMs),
    sessionId: "demo",
    level: pick(LEVELS),
    ctx: {
      traceId: opts.traceId,
      spanId: opts.spanId,
      ...(opts.parentSpanId ? { parentSpanId: opts.parentSpanId } : {}),
    },
    provider: pick(PROVIDERS),
    model: "",
    tool: opts.tool ?? pick(["searchDocs", "dbQuery", "httpFetch"]),
    input: opts.input ?? { q: "example" },
  } as AppTracerEvent;
}

function makeToolResult(opts: {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  tool?: string;
  output?: unknown;
  ok?: boolean;
  latencyMs?: number;
  tsMs: number;
}): AppTracerEvent {
  return {
    type: "tool_result",
    ts: nowIso(opts.tsMs),
    sessionId: "demo",
    level: pick(LEVELS),
    ctx: {
      traceId: opts.traceId,
      spanId: opts.spanId,
      ...(opts.parentSpanId ? { parentSpanId: opts.parentSpanId } : {}),
    },
    provider: pick(PROVIDERS),
    model: "",
    tool: opts.tool ?? pick(["searchDocs", "dbQuery", "httpFetch"]),
    output: opts.output ?? { result: randInt(0, 100) },
    ok: opts.ok ?? true,
    latencyMs: opts.latencyMs ?? randInt(5, 600),
  } as AppTracerEvent;
}

function makeUsage(opts: {
  traceId: string;
  spanId: string;
  tsMs: number;
}): AppTracerEvent {
  return {
    type: "usage",
    ts: nowIso(opts.tsMs),
    sessionId: "demo",
    level: "info",
    ctx: { traceId: opts.traceId, spanId: opts.spanId },
    inputTokens: randInt(1, 1000),
    outputTokens: randInt(0, 1000),
    cost: Math.random() * 0.01,
  } as AppTracerEvent;
}

// Build a trace with a target number of events. The generator will create
// multiple root spans and recursively add child spans, messages and tool
// interactions until the target is reached (or a safety limit).
function generateTrace(targetEvents: number): AppTracerEvent[] {
  const events: AppTracerEvent[] = [];
  const traceId = `trace-${nextId("t")}`;
  let tsOffset = -10000; // start a bit in the past

  const maxRoots = Math.max(1, Math.min(50, Math.floor(targetEvents / 5)));
  const rootCount = randInt(1, Math.min(maxRoots, 12));

  function ensureModelFor(provider: string) {
    const arr = MODELS[provider] ?? ["generic-model"];
    return pick(arr);
  }

  function addSpanTree(parentSpanId: string | undefined, depth: number) {
    if (events.length >= targetEvents) return;
    const spanId = nextId(parentSpanId ? "s" : "root");
    const provider = pick(PROVIDERS);
    const span = makeSpan({
      traceId,
      spanId,
      parentSpanId: parentSpanId ?? undefined,
      provider,
      model: ensureModelFor(provider),
      operation: pick([
        "http:request",
        "llm:completion",
        "db:query",
        "cache:get",
      ]),
      durationMs: randInt(1, 2000),
      status: pick(["ok", "error"]),
      tsMs: tsOffset,
    });
    events.push(span);
    tsOffset += randInt(1, 50);

    // Add a few messages and tool calls inside this span
    const innerCount = randInt(0, depth > 3 ? 2 : 6);
    for (let i = 0; i < innerCount && events.length < targetEvents; i++) {
      const chooseType = Math.random();
      if (chooseType < 0.4) {
        events.push(
          makeMessage({
            traceId,
            spanId: nextId("m"),
            parentSpanId: spanId,
            tsMs: tsOffset,
          })
        );
      } else if (chooseType < 0.75) {
        const tcId = nextId("tc");
        events.push(
          makeToolCall({
            traceId,
            spanId: tcId,
            parentSpanId: spanId,
            tsMs: tsOffset,
          })
        );
        tsOffset += randInt(1, 20);
        events.push(
          makeToolResult({
            traceId,
            spanId: nextId("tr"),
            parentSpanId: spanId,
            tsMs: tsOffset,
          })
        );
      } else {
        events.push(
          makeUsage({ traceId, spanId: nextId("u"), tsMs: tsOffset })
        );
      }
      tsOffset += randInt(1, 40);
    }

    // Recursively add child spans with decreasing probability
    const childCount = Math.random() < 0.6 && depth < 5 ? randInt(0, 3) : 0;
    for (let c = 0; c < childCount && events.length < targetEvents; c++) {
      addSpanTree(spanId, depth + 1);
    }
  }

  // Create root spans
  for (let r = 0; r < rootCount && events.length < targetEvents; r++) {
    addSpanTree(undefined, 0);
  }

  // Add some orphan top-level events to mimic other telemetry
  const orphanCount = randInt(1, Math.min(20, Math.floor(targetEvents / 20)));
  for (let o = 0; o < orphanCount && events.length < targetEvents; o++) {
    events.unshift(
      makeMessage({
        traceId,
        spanId: nextId("orphan"),
        role: pick(ROLES),
        tsMs: tsOffset - randInt(100, 500),
      })
    );
  }

  // Trim in case we overshot
  return events.slice(0, targetEvents);
}

// Decide size: 50% chance of a very large trace, otherwise normal.
const isBig = Math.random() < 0.5;
const targetEvents = isBig ? randInt(2000, 8000) : randInt(20, 300);

export const SAMPLE_TRACE: AppTracerEvent[] = generateTrace(targetEvents);
