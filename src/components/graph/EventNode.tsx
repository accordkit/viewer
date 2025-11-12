import { Handle, Position, type NodeProps } from "@xyflow/react";

import { type CustomNode } from "./types";

// This is the React component for our "eventNode" type
export function EventNode({ data }: NodeProps<CustomNode>) {
  const { event } = data;

  return (
    <div className="graph-node event-node">
      {/* Handle for incoming edges (from parent span) */}
      <Handle type="target" position={Position.Top} />

      {/* Node Content */}
      <div className="node-header">
        <span className="node-badge" data-type={event.type}>
          {event.type}
        </span>
        <span className="node-label">
          {event.type === "message"
            ? event.role
            : event.type === "tool_call"
              ? event.tool
              : "Event"}
        </span>
      </div>
      {event.type === "message" && (
        <div className="node-body">
          <p className="node-message-content">{event.content}</p>
        </div>
      )}
    </div>
  );
}
