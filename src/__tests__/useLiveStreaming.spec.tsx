import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveStreaming } from "../hooks/useLiveStreaming";

import type { LiveClientOptions } from "../utils/liveClient";
import type { TracerEvent } from "@accordkit/tracer";

const liveClients: Array<{
  opts: LiveClientOptions;
  start: () => void;
  stop: () => void;
}> = [];

vi.mock("../utils/liveClient", () => {
  return {
    LiveClient: class {
      opts: LiveClientOptions;
      constructor(opts: LiveClientOptions) {
        this.opts = opts;
        liveClients.push(this);
      }
      start() {
        /* noop */
      }
      stop() {
        /* noop */
      }
    },
  };
});

function ResettableHarness({
  appendEvents,
}: {
  appendEvents: (events: TracerEvent[]) => void;
}) {
  const state = useLiveStreaming({ appendEvents });

  return (
    <div>
      <div data-testid="live">{state.live ? "on" : "off"}</div>
      <div data-testid="follow">{state.followTail ? "on" : "off"}</div>
      <div data-testid="pending">{state.pendingCount}</div>
      <button onClick={state.toggleLive}>toggle live</button>
      <button onClick={state.togglePaused}>toggle paused</button>
      <button onClick={state.followLatest}>follow latest</button>
      <div ref={state.bottomRef} data-testid="sentinel" />
    </div>
  );
}

const mockEvent: TracerEvent = {
  type: "message",
  ts: "2024-01-01T00:00:00.000Z",
  ctx: { traceId: "t", spanId: "s" },
  sessionId: "demo",
  level: "info",
  content: "hello",
  format: "text",
  role: "user",
};

describe("useLiveStreaming", () => {
  beforeEach(() => {
    liveClients.length = 0;
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it("starts live mode and forwards events to the append callback", async () => {
    const appendEvents = vi.fn();
    render(<ResettableHarness appendEvents={appendEvents} />);

    expect(screen.getByTestId("live")).toHaveTextContent("off");
    fireEvent.click(screen.getByRole("button", { name: /toggle live/i }));

    expect(screen.getByTestId("live")).toHaveTextContent("on");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(liveClients).toHaveLength(1);
    await act(async () => {
      liveClients.at(-1)!.opts.onEvent(mockEvent);
    });

    expect(appendEvents).toHaveBeenCalledWith([mockEvent]);
  });

  it("stops following when the user manually scrolls and can re-follow", async () => {
    const appendEvents = vi.fn();
    render(<ResettableHarness appendEvents={appendEvents} />);

    fireEvent.click(screen.getByRole("button", { name: /toggle live/i }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(screen.getByTestId("follow")).toHaveTextContent("on");
    window.scrollY = 150;
    fireEvent.scroll(window);

    expect(screen.getByTestId("follow")).toHaveTextContent("off");

    fireEvent.click(screen.getByRole("button", { name: /follow latest/i }));
    expect(screen.getByTestId("follow")).toHaveTextContent("on");
  });

  it("buffers events while paused and flushes them when resumed", async () => {
    const appendEvents = vi.fn();
    render(<ResettableHarness appendEvents={appendEvents} />);

    fireEvent.click(screen.getByRole("button", { name: /toggle live/i }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    fireEvent.click(screen.getByRole("button", { name: /toggle paused/i }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("pending")).toHaveTextContent("0");

    await act(async () => {
      liveClients.at(-1)!.opts.onEvent(mockEvent);
    });

    expect(screen.getByTestId("pending")).toHaveTextContent("1");
    expect(appendEvents).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /toggle paused/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("pending")).toHaveTextContent("0");
    expect(appendEvents).toHaveBeenCalledWith([mockEvent]);
  });
});
