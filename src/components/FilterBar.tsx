import type { TracerEvent } from "@accordkit/tracer";

const EVENT_TYPES: Array<TracerEvent["type"]> = [
  "message",
  "tool_call",
  "tool_result",
  "usage",
  "span",
];

interface FilterBarProps {
  activeType: "all" | TracerEvent["type"];
  onChange: (type: "all" | TracerEvent["type"]) => void;
}

export function FilterBar({ activeType, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <button
        type="button"
        className={`filter-button ${activeType === "all" ? "active" : ""}`}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {EVENT_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`filter-button ${activeType === type ? "active" : ""}`}
          onClick={() => onChange(type)}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
