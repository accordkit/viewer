import { describe, it, expect } from "vitest";

import { SAMPLE_TRACE } from "../data/sampleTrace";
import { type AppTracerEvent } from "../types/events";
import { buildSpanForest } from "../utils/buildSpanTree";
import { transformForestToFlow } from "../utils/graphLayout";
import { normalizeEvent } from "../utils/normalizeEvent";

describe("transformForestToFlow", () => {
  // 1. Process our sample trace exactly as the app does
  const normalizedEvents = SAMPLE_TRACE.map(normalizeEvent) as AppTracerEvent[];
  const forest = buildSpanForest(normalizedEvents);
  const { nodes, edges } = transformForestToFlow(forest);

  it("should create the correct number of nodes", () => {
    // 1 orphan ("prelude")
    // + 1 root span ("app:request")
    // + 2 child spans ("llm:completion", "db:query")
    // + 3 events attached to "llm:completion"
    // Total = 7 nodes
    expect(nodes).toHaveLength(7);
  });

  it("should create the correct number of edges", () => {
    // 1. app:request -> llm:completion
    // 2. app:request -> db:query
    // 3. llm:completion -> message (user)
    // 4. llm:completion -> tool_call
    // 5. llm:completion -> tool_result
    // Total = 5 edges
    expect(edges).toHaveLength(5);
  });

  it("should assign custom node types", () => {
    const spanNodes = nodes.filter((n) => n.type === "spanNode");
    const eventNodes = nodes.filter((n) => n.type === "eventNode");
    // 3 spans + 4 non-span events = 7 total
    expect(spanNodes).toHaveLength(3);
    expect(eventNodes).toHaveLength(4);
  });

  it("should separate orphans and roots horizontally", () => {
    // This is the test for the bug we fixed (image_85389f.jpg)
    const orphanNode = nodes.find(
      (n) => (n.data.event as AppTracerEvent).ctx.spanId === "prelude"
    );
    const rootSpanNode = nodes.find(
      (n) => (n.data.event as AppTracerEvent).ctx.spanId === "root"
    );

    expect(orphanNode).toBeDefined();
    expect(rootSpanNode).toBeDefined();

    // Their X positions MUST be different, proving they are in separate columns
    expect(orphanNode!.position.x).not.toEqual(rootSpanNode!.position.x);
  });
});
