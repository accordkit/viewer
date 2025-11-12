// src/components/graph/SpanNode.tsx
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { type AppSpanEvent } from "../../types/events";

import { type CustomNode } from "./types";

export function SpanNode({ data }: NodeProps<CustomNode>) {
  // We can safely cast here because the `type` prop in graphLayout.ts
  // ensures this component only receives span events.
  const span = data.event as AppSpanEvent;

  return (
    <div className="graph-node span-node">
      {/* Handle for incoming edges (from parent) */}
      <Handle type="target" position={Position.Top} />

      {/* Node Content */}
      <div className="node-header">
        <span className="node-badge" data-type="span">
          SPAN
        </span>
        <span className="node-label">{span.operation}</span>
      </div>
      <div className="node-body">
        <span>
          {span.durationMs} ms · {span.status}
        </span>
      </div>

      {/* Handle for outgoing edges (to children) */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
