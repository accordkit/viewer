import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EventList } from "../components/EventList";

import type { AppTracerEvent } from "../types/events";
import type { MutableRefObject } from "react";

describe("EventList virtualization", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders only the initial window for large datasets", () => {
    const events = buildMessageEvents(150);
    render(
      <EventList
        events={events}
        bottomRef={createBottomRef()}
        onListApiChange={() => {}}
      />
    );

    expect(screen.getByText("Event #0")).toBeInTheDocument();
    expect(screen.queryByText("Event #149")).toBeNull();
  });

  it("reveals deeper rows after scrolling", async () => {
    const events = buildMessageEvents(220);
    render(
      <EventList
        events={events}
        bottomRef={createBottomRef()}
        onListApiChange={() => {}}
      />
    );

    const list = screen.getByTestId("event-list") as HTMLElement;
    mockScrollableList(list);

    list.scrollTop = 50000;
    fireEvent.scroll(list);

    await waitFor(() => {
      expect(screen.getByText("Event #219")).toBeInTheDocument();
    });
  });
});

function buildMessageEvents(count: number): AppTracerEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    type: "message",
    ts: new Date(2024, 0, 1, 0, 0, index).toISOString(),
    sessionId: "session",
    level: "info",
    ctx: { traceId: "trace", spanId: `msg-${index}` },
    role: "user",
    provider: "openai",
    model: "gpt-4o-mini",
    content: `Event #${index}`,
    format: "text",
  }));
}

function mockScrollableList(element: HTMLElement) {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: 600,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: 60000,
  });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    writable: true,
    value: 0,
  });
  vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => {
    return {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      toJSON() {
        return {};
      },
    } as DOMRect;
  });
}

function createBottomRef(): MutableRefObject<HTMLDivElement | null> {
  return { current: null };
}
