import { TracerEvent } from "@accordkit/tracer";

import type { AppTracerEvent } from "../types/events";

export type LiveTransport = "sse" | "ws";

export interface LiveClientOptions {
  /** SSE endpoint or WS URL. Defaults to `/api/events`. */
  url?: string;
  /** Prefer a specific transport; default is 'sse' then fallback to 'ws'. */
  transport?: LiveTransport;
  /** Called for every parsed TracerEvent. */
  onEvent: (evt: TracerEvent) => void;
  /** Optional: called on connection (opened). */
  onOpen?: () => void;
  /** Optional: called on permanent close/error. */
  onError?: (err: unknown) => void;
}

export class LiveClient {
  private es?: EventSource;
  private ws?: WebSocket;
  private stopped = false;

  constructor(private readonly opts: LiveClientOptions) {}

  start() {
    const url = this.opts.url ?? "/api/events";
    const prefer = this.opts.transport;

    if (prefer === "ws" || (!this.hasSSE() && this.hasWS())) {
      this.startWS(toWS(url));
      return;
    }

    if (this.hasSSE()) {
      this.startSSE(url);
      return;
    }

    if (this.hasWS()) {
      this.startWS(toWS(url));
      return;
    }

    this.opts.onError?.(new Error("No supported live transport"));
  }

  stop() {
    this.stopped = true;
    if (this.es) {
      this.es.close();
      this.es = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  private startSSE(url: string) {
    try {
      this.es = new EventSource(url);
      this.es.onopen = () => this.opts.onOpen?.();
      this.es.onerror = (e) => {
        this.opts.onError?.(e);
        this.stop();
      };
      this.es.onmessage = (msg) => {
        // Accept plain JSON or JSONL via SSE `data: ...`
        parseMaybeJSON(msg.data, this.opts.onEvent);
      };
    } catch (e) {
      this.opts.onError?.(e);
      this.stop();
    }
  }

  private startWS(url: string) {
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => this.opts.onOpen?.();
      this.ws.onerror = (e) => {
        this.opts.onError?.(e);
        this.stop();
      };
      this.ws.onmessage = (m) => {
        const data = typeof m.data === "string" ? m.data : "";
        // Accept single JSON or JSONL chunks.
        parseMaybeJSON(data, this.opts.onEvent);
      };
      this.ws.onclose = () => this.stop();
    } catch (e) {
      this.opts.onError?.(e);
      this.stop();
    }
  }

  private hasSSE() {
    return typeof window !== "undefined" && "EventSource" in window;
  }
  private hasWS() {
    return typeof window !== "undefined" && "WebSocket" in window;
  }
}

/** Parse a string that may contain one JSON object or multiple lines of JSON. */
function parseMaybeJSON(s: string, onEvent: (e: TracerEvent) => void) {
  const lines = s.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as TracerEvent;
      // Basic shape sanity (ctx + ts + type)
      if (obj && obj.ctx && obj.ts && typeof obj.type === "string") {
        onEvent(obj);
      }
    } catch {
      // ignore parse errors to keep stream resilient
    }
  }
}

function toWS(s: string): string {
  try {
    const u = new URL(s, window.location.href);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return u.toString();
  } catch {
    // Fallback: naive replace
    return s.replace(/^http/, "ws");
  }
}
