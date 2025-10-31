interface FollowEventsPillProps {
  visible: boolean;
  onFollow: () => void;
}

export function FollowEventsPill({ visible, onFollow }: FollowEventsPillProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "1rem",
        zIndex: 50,
      }}
    >
      <button
        type="button"
        className="filter-button"
        onClick={onFollow}
        aria-label="Follow events (scroll to bottom)"
      >
        ⬇ Follow events
      </button>
    </div>
  );
}
