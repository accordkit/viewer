import type { TracerEvent } from "@accordkit/core";

export interface ParseError {
  line: number;
  raw: string;
  message: string;
}

export interface ParseResult {
  events: TracerEvent[];
  errors: ParseError[];
}

/**
 * Parse newline-delimited JSON (JSONL) into AccordKit tracer events.
 * Lines that fail to parse are collected as non-fatal errors.
 */
export function parseJsonLines(content: string): ParseResult {
  const events: TracerEvent[] = [];
  const errors: ParseError[] = [];

  content.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const parsed = JSON.parse(trimmed) as TracerEvent;
      events.push(parsed);
    } catch (err) {
      errors.push({
        line: index + 1,
        raw: trimmed.slice(0, 200),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return { events: sortEvents(events), errors };
}

/**
 * Sort events chronologically based on ISO timestamp; falls back to insertion order.
 */
export function sortEvents(events: TracerEvent[]): TracerEvent[] {
  return [...events].sort((a, b) => {
    const aTime = Date.parse(a.ts ?? "");
    const bTime = Date.parse(b.ts ?? "");

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });
}
