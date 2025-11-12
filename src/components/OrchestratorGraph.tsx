import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useMemo } from "react";

import { AppTracerEvent } from "../types/events";
import { buildSpanForest } from "../utils/buildSpanTree";
import { transformForestToFlow } from "../utils/graphLayout";

import { EventNode } from "./graph/EventNode";
import { SpanNode } from "./graph/SpanNode";

import "./graph/GraphNodes.css";

const nodeTypes = {
  spanNode: SpanNode,
  eventNode: EventNode,
};

interface OrchestratorGraphProps {
  events: AppTracerEvent[];
}

export function OrchestratorGraph({ events }: OrchestratorGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const forest = buildSpanForest(events);
    return transformForestToFlow(forest);
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="panel">
        <div
          className="panel-body"
          style={{
            textAlign: "center",
            color: "rgba(148,163,184,0.8)",
            height: "400px",
            display: "grid",
            placeContent: "center",
          }}
        >
          <p>No events match the current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="panel"
      data-testid="event-graph"
      style={{
        height: "70vh", // Give the graph viewport a fixed height
        minHeight: "500px",
        marginBottom: "1.5rem",
      }}
    >
      <ReactFlowProvider>
        <ReactFlow
          className="orchestrator-flow"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={true}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={16} />
          <Controls />
          <MiniMap
            className="graph-minimap"
            bgColor="rgba(15, 23, 42, 0.92)"
            maskColor="rgba(2, 6, 23, 0.65)"
            maskStrokeColor="rgba(94, 234, 212, 0.35)"
            nodeColor={(n) => (n.type === "spanNode" ? "#f9a8d4" : "#a5b4fc")}
            nodeStrokeColor={(n) =>
              n.type === "spanNode" ? "rgba(249, 168, 212, 0.85)" : "rgba(165, 180, 252, 0.85)"
            }
            pannable
            zoomable
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
