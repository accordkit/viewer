import type { AppTracerEvent } from "../types/events";

export type EventType = AppTracerEvent["type"];

export interface FilterState {
  types: Set<EventType> | "all";
  providers: Set<string> | "all";
  models: Set<string> | "all";
  levels: Set<"debug" | "info" | "warn" | "error"> | "all";
  q: string;
}

export const DEFAULT_FILTERS: FilterState = {
  types: "all",
  providers: "all",
  models: "all",
  levels: "all",
  q: "",
};

export function extractFacets(events: AppTracerEvent[]) {
  const types = new Set<EventType>();
  const providers = new Set<string>();
  const models = new Set<string>();
  const levels = new Set<"debug" | "info" | "warn" | "error">();

  for (const e of events) {
    types.add(e.type);
    if (e.provider) providers.add(e.provider);
    if (e.model) models.add(e.model);
    levels.add(e.level);
  }
  return {
    types: Array.from(types).sort(),
    providers: Array.from(providers).sort(),
    models: Array.from(models).sort(),
    levels: Array.from(levels).sort(),
  };
}

/** Build a fast predicate once; avoid recreating closures per event. */
export function buildFilterPredicate(f: FilterState) {
  const q = f.q.trim().toLowerCase();
  const typeAll = f.types === "all" ? null : new Set(f.types);
  const provAll = f.providers === "all" ? null : new Set(f.providers);
  const modelAll = f.models === "all" ? null : new Set(f.models);
  const levelAll = f.levels === "all" ? null : new Set(f.levels);

  return (e: AppTracerEvent): boolean => {
    if (typeAll && !typeAll.has(e.type)) return false;
    if (levelAll && !levelAll.has(e.level)) return false;
    if (provAll && (!e.provider || !provAll.has(e.provider))) return false;
    if (modelAll && (!e.model || !modelAll.has(e.model))) return false;

    if (!q) return true;

    // minimal, safe search fields across event shapes
    if (e.model && e.model.toLowerCase().includes(q)) return true;
    if (e.provider && e.provider.toLowerCase().includes(q)) return true;

    switch (e.type) {
      case "message":
        return (
          ((e.role && e.role.toLowerCase().includes(q)) ||
            (e.content && e.content.toLowerCase().includes(q)) ||
            (e.format && e.format.toLowerCase().includes(q))) ??
          false
        );
      case "tool_call":
        return (
          (e.tool && e.tool.toLowerCase().includes(q)) ||
          JSON.stringify(e.input ?? {})
            .toLowerCase()
            .includes(q)
        );
      case "tool_result":
        return JSON.stringify(e.output ?? {})
          .toLowerCase()
          .includes(q);
      case "span":
        return (
          e.operation.toLowerCase().includes(q) ||
          (e.status && e.status.toLowerCase().includes(q)) ||
          JSON.stringify(e.attrs ?? {})
            .toLowerCase()
            .includes(q)
        );
      default:
        return false;
    }
  };
}
