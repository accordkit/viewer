import type { FilterState } from "../utils/eventFilters";
import type { TracerEvent } from "@accordkit/tracer";

interface Facets {
  types: TracerEvent["type"][];
  providers: string[];
  models: string[];
  levels: Array<"debug" | "info" | "warn" | "error">;
}

export function AdvancedFilterBar({
  filters,
  onChange,
  facets,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  facets: Facets;
}) {
  const toggleSet =
    <T,>(key: keyof FilterState) =>
    (value: T) => {
      const cur = filters[key] as Set<T> | "all";
      if (cur === "all") {
        onChange({ ...filters, [key]: new Set([value]) });
      } else {
        const next = new Set(cur);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        onChange({ ...filters, [key]: next.size ? next : "all" });
      }
    };

  const setQuery = (q: string) => onChange({ ...filters, q });

  const isOn =
    <T,>(key: keyof FilterState, v: T) =>
    () =>
      filters[key] === "all" ? false : (filters[key] as Set<T>).has(v);

  const pill = (active: boolean) =>
    ({
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid rgba(148,163,184,0.24)",
      background: active ? "rgba(94,234,212,0.1)" : "transparent",
      color: active ? "#5eead4" : "rgba(226,232,240,0.9)",
      fontSize: "0.8rem",
      cursor: "pointer",
    }) as React.CSSProperties;

  return (
    <div
      className="panel"
      style={{
        marginBottom: "0.75rem",
        border: "1px solid rgba(148,163,184,0.15)",
      }}
    >
      <div className="panel-body" style={{ display: "grid", gap: "0.6rem" }}>
        <input
          value={filters.q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (provider, model, message, tool, span attrs)…"
          style={{
            width: "100%",
            padding: "0.45rem 0.6rem",
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.25)",
            background: "rgba(15,23,42,0.6)",
            color: "#e2e8f0",
          }}
        />

        <Row label="Types">
          {facets.types.map((t) => {
            const active = isOn("types", t)();
            return (
              <button
                key={t}
                style={pill(active)}
                onClick={() => toggleSet("types")(t)}
              >
                {t}
              </button>
            );
          })}
        </Row>

        <Row label="Providers">
          {facets.providers.map((p) => {
            const active = isOn("providers", p)();
            return (
              <button
                key={p}
                style={pill(active)}
                onClick={() => toggleSet("providers")(p)}
              >
                {p}
              </button>
            );
          })}
        </Row>

        <Row label="Models">
          {facets.models.map((m) => {
            const active = isOn("models", m)();
            return (
              <button
                key={m}
                style={pill(active)}
                onClick={() => toggleSet("models")(m)}
              >
                {m}
              </button>
            );
          })}
        </Row>

        <Row label="Levels">
          {facets.levels.map((lv) => {
            const active = isOn("levels", lv)();
            return (
              <button
                key={lv}
                style={pill(active)}
                onClick={() => toggleSet("levels")(lv)}
              >
                {lv}
              </button>
            );
          })}
        </Row>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <div
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(148,163,184,0.9)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {children}
      </div>
    </div>
  );
}
