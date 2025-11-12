// src/utils/graphLayout.ts
import dagre from "dagre";

import { type CustomNode } from "../components/graph/types";
import { type AppTracerEvent } from "../types/events";

import { type SpanNode } from "./buildSpanTree";

import type { Edge, Node, XYPosition } from "@xyflow/react";

interface ForestTransform {
  nodes: Node[];
  edges: Edge[];
}

interface Forest {
  roots: SpanNode[];
  orphans: AppTracerEvent[];
}

// Node dimensions (must match CSS)
const NODE_WIDTH = 280;
const SPAN_NODE_HEIGHT = 80;
const EVENT_NODE_HEIGHT = 50;
const HORIZONTAL_GAP = 60; // Space between trees/orphans

/**
 * Transforms our span forest into a node/edge graph for xyflow.
 *
 * This version lays out each root and orphan as a separate
 * component, then arranges them horizontally to prevent overlap.
 */
export function transformForestToFlow(forest: Forest): ForestTransform {
  const allNodes: CustomNode[] = [];
  const allEdges: Edge[] = [];
  let currentXOffset = 0;

  // Layout and add all orphan events
  for (const orphan of forest.orphans) {
    const { nodes, edges, width } = layoutComponent(orphan);
    // Apply the horizontal offset to all nodes in this component
    for (const node of nodes) {
      node.position.x += currentXOffset;
      allNodes.push(node);
    }
    allEdges.push(...edges);
    currentXOffset += width + HORIZONTAL_GAP;
  }

  // Layout and add all root span trees
  for (const root of forest.roots) {
    const { nodes, edges, width } = layoutComponent(root);
    // Apply the horizontal offset
    for (const node of nodes) {
      node.position.x += currentXOffset;
      allNodes.push(node);
    }
    allEdges.push(...edges);
    currentXOffset += width + HORIZONTAL_GAP;
  }

  return { nodes: allNodes, edges: allEdges };
}

/**
 * Creates and layouts a new Dagre graph for a single component
 * (either one orphan or one root span tree).
 */
function layoutComponent(root: AppTracerEvent | SpanNode) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB", // Top-to-Bottom layout
    nodesep: 40,
    ranksep: 50,
  });

  const nodes: CustomNode[] = [];
  const edges: Edge[] = [];

  // Add nodes and edges to the Dagre graph
  if ("event" in root) {
    // It's a SpanNode, traverse the tree
    addSpanNodeToGraph(root as SpanNode, g, nodes, edges);
  } else {
    // It's an orphan AppTracerEvent
    const orphan = root as AppTracerEvent;
    const id = getEventId(orphan);
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: { label: `Orphan: ${orphan.type}`, event: orphan },
      type: "eventNode",
    });
    g.setNode(id, { width: NODE_WIDTH, height: EVENT_NODE_HEIGHT });
  }

  // Run the layout algorithm for *this component only*
  dagre.layout(g);

  const graphWidth = g.graph().width ?? NODE_WIDTH;

  // Apply calculated positions to the nodes
  const positionedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (nodeWithPosition) {
      node.position = getNodePosition(node, nodeWithPosition);
    }
    return node;
  });

  return { nodes: positionedNodes, edges, width: graphWidth };
}

/**
 * Recursively adds span nodes, event nodes, and their edges to a Dagre graph.
 */
function addSpanNodeToGraph(
  spanNode: SpanNode,
  g: dagre.graphlib.Graph,
  nodes: CustomNode[],
  edges: Edge[]
) {
  const nodeId = spanNode.id;

  nodes.push({
    id: nodeId,
    position: { x: 0, y: 0 },
    data: { label: spanNode.event.operation, event: spanNode.event },
    type: "spanNode",
  });
  g.setNode(nodeId, { width: NODE_WIDTH, height: SPAN_NODE_HEIGHT });

  // Add attached non-span events
  for (const event of spanNode.events) {
    const eventId = getEventId(event);
    nodes.push({
      id: eventId,
      position: { x: 0, y: 0 },
      data: { label: event.type, event },
      type: "eventNode",
    });
    g.setNode(eventId, { width: NODE_WIDTH, height: EVENT_NODE_HEIGHT });

    edges.push({
      id: `${nodeId}->${eventId}`,
      source: nodeId,
      target: eventId,
      style: { stroke: "#64748b", strokeDasharray: "5 5" },
    });
    g.setEdge(nodeId, eventId);
  }

  // Recursively add child spans
  for (const child of spanNode.children) {
    addSpanNodeToGraph(child, g, nodes, edges); // Recurse
    const childId = child.id;

    edges.push({
      id: `${nodeId}->${childId}`,
      source: nodeId,
      target: childId,
      animated: child.event.status === "streaming",
      style: { stroke: "#f8fafc", strokeWidth: 2 },
    });
    g.setEdge(nodeId, childId);
  }
}

/** Helper to get a unique ID for non-span events */
function getEventId(event: AppTracerEvent): string {
  return `${event.ctx.traceId}-${event.ctx.spanId}-${event.ts}`;
}

/** Helper to center the node on its calculated position */
function getNodePosition(
  node: CustomNode,
  nodeWithPosition: dagre.Node
): XYPosition {
  const height =
    node.type === "spanNode" ? SPAN_NODE_HEIGHT : EVENT_NODE_HEIGHT;
  return {
    x: nodeWithPosition.x - NODE_WIDTH / 2,
    y: nodeWithPosition.y - height / 2,
  };
}
