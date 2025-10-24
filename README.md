# @accordkit/viewer

[![Part of AccordKit](https://img.shields.io/badge/AccordKit-ecosystem-00cc88?style=flat-square)](https://github.com/accordkit)

> **Part of the [AccordKit](https://github.com/accordkit) ecosystem** —  
> an open, AI-agnostic tracing SDK for LLM-powered and ChatGPT-interoperable applications.  
> AccordKit gives developers local-first observability: **no vendor lock-in, no opaque dashboards**, just clean event streams and tools that work anywhere.

[🌍 Positioning Map →](https://github.com/accordkit/docs/blob/main/assets/accordkit_positioning_map.png)

Interactive AccordKit trace viewer built with React + Vite. Drop a `.jsonl`
trace (newline-delimited AccordKit events) to explore sessions, timeline
metadata, and provider details. Designed with TraceTalk plugin slots so future
overlays can extend the UI without forking.

---

## Features

- Drag & drop JSONL ingest with a bundled sample trace for quick demos.
- Timeline list highlighting `message`, `tool_call`, `usage`, `tool_result`, and
  `span` events with provider/model metadata.
- Summary sidebar with session/provider counts and customizable plugin slots.
- Streaming-aware sorting and tolerant parsing (per-line error reporting).
- TypeScript-first React codebase with Vitest + Testing Library coverage.

---

## Getting Started

```bash
pnpm install
pnpm --filter @accordkit/viewer dev
```

Visit <http://localhost:5173> and drop a `.jsonl` file exported from an
AccordKit sink. Use the **Load sample trace** button if you need a quick demo
dataset.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm --filter @accordkit/viewer dev` | Start the Vite dev server with HMR. |
| `pnpm --filter @accordkit/viewer build` | Type-check and build for production. |
| `pnpm --filter @accordkit/viewer test` | Run Vitest unit/integration tests. |
| `pnpm --filter @accordkit/viewer lint` | Run ESLint (TypeScript + React). |
| `pnpm --filter @accordkit/viewer format` | Format sources with Prettier. |

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

## Plugin Slots

The viewer exposes two extension points:

- **TopBannerSlot** — replace the hero banner with TraceTalk announcements or
  environment notices.
- **RightPanelSlot** — inject custom analytics or investigation tools beside the
  event list.

Register plugins by wrapping `<App />` with `PluginProvider` and passing slot
components. See `src/plugins.tsx` for details and default implementations.

---

## Testing & Conventions

- Tests live under `src/__tests__` and run via Vitest in a JSDOM environment.
- Use `parseJsonLines` for JSONL ingestion; keep parsing tolerant and collect
  errors without aborting the entire trace.
- Keep styling in `src/styles.css`; the viewer uses a glassmorphism-inspired
  theme without heavy CSS frameworks.
- Follow the repository-wide [coding rules](../CODING_RULES.md) for open-source
  readiness: tests, docs, strict TypeScript, and commit hygiene.

---

## Roadmap

- Filter by session/provider, not only event type.
- Chart span timelines (swimlane or Gantt) using duration metadata.
- Plugin SDK docs + example TraceTalk overlays.
- Export filtered traces back to JSONL for sharing.

Contributions welcome! Open an issue or pull request in the AccordKit monorepo.
