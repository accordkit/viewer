import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { SAMPLE_TRACE } from "../data/sampleTrace";
import { type AppTracerEvent } from "../types/events";
import {
  DEFAULT_FILTERS,
  buildFilterPredicate,
  extractFacets,
  type FilterState,
} from "../utils/eventFilters";
import { normalizeEvent } from "../utils/normalizeEvent";
import { parseJsonLines } from "../utils/parseEvents";

const MAX_EVENTS = 10_000; // ring buffer cap

export interface TraceDataHook {
  events: AppTracerEvent[];
  errors: string[];
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  fileName: string | null;
  facets: ReturnType<typeof extractFacets>;
  filteredEvents: AppTracerEvent[];
  handleFiles: (files: FileList | File[]) => Promise<void>;
  loadSampleTrace: () => void;
  appendEvents: (incoming: AppTracerEvent[]) => void;
}

export function useTraceData(): TraceDataHook {
  const [events, setEvents] = useState<AppTracerEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [fileName, setFileName] = useState<string | null>(null);

  const facets = useMemo(() => extractFacets(events), [events]);
  const deferredQuery = useDeferredValue(filters.q);

  const filteredEvents = useMemo(() => {
    const pred = buildFilterPredicate({ ...filters, q: deferredQuery });
    return events.filter(pred);
  }, [events, filters, deferredQuery]);

  const appendEvents = useCallback((incoming: AppTracerEvent[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      const next = prev.concat(incoming);
      if (next.length <= MAX_EVENTS) return next;
      return next.slice(next.length - MAX_EVENTS);
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    const text = await file.text();
    const { events: parsedEvents, errors: parseErrors } = parseJsonLines(text);
    const normalizedEvents = parsedEvents.map(normalizeEvent);

    setEvents(normalizedEvents);
    setErrors(parseErrors.map((err) => `Line ${err.line}: ${err.message}`));
    setFilters(DEFAULT_FILTERS);
    setFileName(file.name);
  }, []);

  const loadSampleTrace = useCallback(() => {
    const serialized = SAMPLE_TRACE.map((event) => JSON.stringify(event)).join(
      "\n"
    );
    const { events: parsed } = parseJsonLines(serialized);
    const normalizedEvents = parsed.map(normalizeEvent);

    setEvents(normalizedEvents);
    setErrors([]);
    setFilters(DEFAULT_FILTERS);
    setFileName("sample-trace.jsonl");
  }, []);

  return {
    events,
    errors,
    filters,
    setFilters,
    fileName,
    facets,
    filteredEvents,
    handleFiles,
    loadSampleTrace,
    appendEvents,
  };
}
