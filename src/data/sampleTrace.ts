import type { TracerEvent } from "@accordkit/tracer";

export const SAMPLE_TRACE: TracerEvent[] = [
  // root span
  {
    type: "span",
    ts: "2024-01-01T10:00:00.000Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "root" },
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "app:request",
    durationMs: 1200,
    status: "ok",
  },
  // child span under root
  {
    type: "span",
    ts: "2024-01-01T10:00:00.100Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "child-a", parentSpanId: "root" },
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "llm:completion",
    durationMs: 800,
    status: "ok",
  },
  // message inside child span
  {
    type: "message",
    ts: "2024-01-01T10:00:00.150Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "m1", parentSpanId: "child-a" },
    provider: "openai",
    model: "gpt-4o-mini",
    role: "user",
    content: "Summarize this.",
    format: "text",
  },
  // tool_call inside child span
  {
    type: "tool_call",
    ts: "2024-01-01T10:00:00.300Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "tc1", parentSpanId: "child-a" },
    provider: "openai",
    model: "gpt-4o-mini",
    tool: "searchDocs",
    input: { q: "vector db" },
  },
  // tool_result inside child span
  {
    type: "tool_result",
    ts: "2024-01-01T10:00:00.500Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "tr1", parentSpanId: "child-a" },
    provider: "openai",
    model: "gpt-4o-mini",
    tool: "searchDocs",
    output: { hits: 3 },
    ok: true,
    latencyMs: 100,
  },
  // another child span under root
  {
    type: "span",
    ts: "2024-01-01T10:00:00.950Z",
    sessionId: "demo",
    level: "info",
    ctx: { traceId: "t1", spanId: "child-b", parentSpanId: "root" },
    provider: "openai",
    model: "gpt-4o-mini",
    operation: "db:query",
    durationMs: 300,
    status: "ok",
    attrs: { table: "docs", where: "topic='vector'" },
  },
  // top-level non-span (orphan), will render above root span
  {
    type: "message",
    ts: "2024-01-01T09:59:59.900Z",
    sessionId: "demo",
    level: "debug",
    ctx: { traceId: "t1", spanId: "prelude" },
    role: "system",
    content: "Trabzonspor!",
    format: "text",
  },
];
