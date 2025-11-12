import type { AppTracerEvent } from "../../types/events";
import type { Node } from "@xyflow/react";

/**
 * Shared data structure for all custom graph nodes.
 * This is the shape of the `data` prop that xyflow will provide.
 */
export type CustomNodeData = {
  label: string;
  event: AppTracerEvent;
};

/**
 * Application's canonical Node type.
 * This combines the base Node type with our custom data shape.
 */
export type CustomNode = Node<CustomNodeData>;
