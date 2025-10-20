interface SummaryCard {
  title: string;
  value: number | string;
  hint?: string;
}

interface EventSummaryProps {
  totalEvents: number;
  uniqueSessions: number;
  uniqueProviders: number;
  byType: Record<string, number>;
}

export function EventSummary({
  totalEvents,
  uniqueSessions,
  uniqueProviders,
  byType,
}: EventSummaryProps) {
  const cards: SummaryCard[] = [
    { title: "Events", value: totalEvents },
    { title: "Sessions", value: uniqueSessions },
    { title: "Providers", value: uniqueProviders },
  ];

  return (
    <div className="panel summary-grid">
      <div className="panel-header">
        <h2>Trace Overview</h2>
      </div>
      <div className="panel-body">
        <div className="summary-grid">
          {cards.map((card) => (
            <div className="summary-card" key={card.title}>
              <h3>{card.title}</h3>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "rgba(148,163,184,0.85)",
              marginBottom: "0.6rem",
            }}
          >
            Events by Type
          </h3>
          <div className="filter-bar">
            {Object.entries(byType).map(([type, count]) => (
              <span
                className="filter-button active"
                key={type}
                style={{ cursor: "default" }}
              >
                {type} · {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
