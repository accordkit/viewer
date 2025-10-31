interface LiveControlsProps {
  live: boolean;
  onToggleLive: () => void;
  paused: boolean;
  onTogglePaused: () => void;
  received: number;
  pendingCount: number;
}

export function LiveControls({
  live,
  onToggleLive,
  paused,
  onTogglePaused,
  received,
  pendingCount,
}: LiveControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        margin: "0.25rem 0 0.75rem",
      }}
    >
      <button
        onClick={onToggleLive}
        style={{
          padding: "0.3rem 0.6rem",
          borderRadius: 8,
          border: "1px solid rgba(148,163,184,0.24)",
          background: live ? "rgba(34,197,94,0.15)" : "rgba(15,23,42,0.6)",
          color: live ? "#86efac" : "#e2e8f0",
          fontSize: "0.85rem",
        }}
        aria-label={live ? "Stop live" : "Start live"}
      >
        {live ? "■ Stop live" : "▶ Start live"}
      </button>
      <button
        onClick={onTogglePaused}
        disabled={!live}
        style={{
          padding: "0.3rem 0.6rem",
          borderRadius: 8,
          border: "1px solid rgba(148,163,184,0.24)",
          background: paused ? "rgba(245,158,11,0.15)" : "rgba(15,23,42,0.6)",
          color: paused ? "#fcd34d" : "#e2e8f0",
          fontSize: "0.85rem",
          opacity: live ? 1 : 0.5,
        }}
        aria-label={paused ? "Resume rendering" : "Pause rendering"}
      >
        {paused ? "⏵ Resume" : "⏸ Pause"}
      </button>
      <div
        style={{
          marginLeft: "auto",
          fontSize: "0.8rem",
          color: "rgba(148,163,184,0.9)",
        }}
      >
        live: {live ? "on" : "off"} · received: {received}
        {paused && pendingCount > 0 ? ` · buffered: ${pendingCount}` : ""}
      </div>
    </div>
  );
}
