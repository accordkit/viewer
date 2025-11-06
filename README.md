# @accordkit/viewer

[![Part of AccordKit](https://img.shields.io/badge/AccordKit-ecosystem-00cc88?style=flat-square)](https://github.com/accordkit)

> **Part of the [AccordKit](https://github.com/accordkit) ecosystem**   
> an open, AI-agnostic tracing SDK for LLM-powered and ChatGPT-interoperable applications.  
> AccordKit gives developers local-first observability: **no vendor lock-in, no opaque dashboards**, just clean event streams and tools that work anywhere.

The AccordKit Viewer is a lightweight, pluggable trace viewer for AI tool and model observability.
It visualizes traces, spans, messages, and tool calls in real time, with plugin slots for custom visualizations and metrics.

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run the dev server

```bash
pnpm dev
```

Then open http://localhost:5173

### 3. Load sample traces

Inside the app, click “Load sample trace” — or provide your own .json trace exported from the AccordKit tracer SDK.

### 4. Extend with your own plugin

```tsx
import { PluginProvider } from "./plugins";
import { LatencyBarPlugin } from "./plugins/LatencyBarPlugin";
import App from "./App";

export function Main() {
  return (
    <PluginProvider slots={{ EventExtras: LatencyBarPlugin }}>
      <App />
    </PluginProvider>
  );
}
```

---

## ✨ Features

- 🪶 Trace and event visualization — Inspect spans, messages, tool calls, and results
- 🌲 Nested span tree — Hierarchical span rendering with indentation and sorting
- 🧩 Plugin slots — Extend the viewer with your own UI blocks (TopBanner, RightPanel, EventExtras)
- ⚡ Latency and usage plugins — Example: LatencyBarPlugin shows timing and token usage
- 🔍 Advanced filters — Filter by type, provider, model, log level, or full-text search
- 🧠 Typed utils — Fully typed build functions (buildSpanForest, eventFilters), zero any
- 🧪 Full test coverage — Vitest + React Testing Library for new components and utilities
- 🔄 (coming soon) Live tail mode — Stream traces in real time via SSE/WebSocket

---

## 🧩 Plugin API

The viewer is fully extensible through slots:

```tsx
import { PluginProvider } from "./plugins";
import { LatencyBarPlugin } from "./plugins/LatencyBarPlugin";

<PluginProvider slots={{ EventExtras: LatencyBarPlugin }}>
  <App />
</PluginProvider>;
```

Available slots:
| Slot name | Props | Description |
| ------------- | --------------------------- | ---------------------------------------------- |
| `TopBanner` | none | Renders a banner at the top of the viewer |
| `RightPanel` | `{ events: TracerEvent[] }` | Custom side panel content |
| `EventExtras` | `{ event: TracerEvent }` | Extra per-event content (e.g. latency, tokens) |

Each slot receives contextual props (e.g. { event } for EventExtras).

Example plugin:

```ts
import type { TracerEvent } from "@accordkit/tracer";

export function LatencyBarPlugin({ event }: { event: TracerEvent }) {
  if (event.type !== "span") return null;
  return (
    <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
      ⏱ {event.durationMs} ms
    </div>
  );
}
```

---

## Scripts

| Command       | Description                          |
| ------------- | ------------------------------------ |
| `pnpm dev`    | Start the Vite dev server with HMR.  |
| `pnpm build`  | Type-check and build for production. |
| `pnpm test`   | Run Vitest unit/integration tests.   |
| `pnpm lint`   | Run ESLint (TypeScript + React).     |
| `pnpm format` | Format sources with Prettier.        |

---

## JSONL Event Format

Each line should be a single AccordKit `TracerEvent` (the same shape emitted by
the tracer or provider adapters). Example:

```jsonl
{"ts":"2024-05-04T10:00:00.000Z","sessionId":"sess_1","level":"info","ctx":{"traceId":"tr_1","spanId":"sp_1"},"type":"message","role":"user","content":"Ping"}
{"ts":"2024-05-04T10:00:01.000Z","sessionId":"sess_1","level":"info","ctx":{"traceId":"tr_1","spanId":"sp_2","parentSpanId":"sp_1"},"type":"tool_call","tool":"weather","input":{"city":"AMS"}}
{"ts":"2024-05-04T10:00:02.000Z","sessionId":"sess_1","level":"info","ctx":{"traceId":"tr_1","spanId":"sp_2"},"type":"tool_result","tool":"weather","output":{"temp":12},"ok":true,"latencyMs":1200}
```

Invalid lines are skipped and surfaced in the UI with line numbers so you can
inspect problematic entries.

---

## 🧩 Development Philosophy

AccordKit Viewer follows a few guiding principles:

- Typed-first: Every line of code is strictly typed and checked end-to-end.
- Composable core: Everything is a slot, a hook, or a pure function.
- Observable by design: Focused on clarity, not complexity. Every trace tells a story.
- Open & extensible: No lock-in. Just React, TypeScript, and your imagination.
- Performance-aware: Works well with tens of thousands of events and spans.

The goal: make AI tool tracing human-readable.

---

## 🪪 License

MIT © AccordKit Contributors

## 🤝 Contributing

Issues and PRs welcome!  
