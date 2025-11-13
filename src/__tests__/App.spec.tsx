import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom";

const deterministicTrace = vi.hoisted(() => {
  const { DETERMINISTIC_TRACE } = require("./fixtures/deterministicTrace.ts");
  return DETERMINISTIC_TRACE;
});

vi.mock("../data/sampleTrace", () => ({
  SAMPLE_TRACE: deterministicTrace,
}));

import App from "../App";

describe("App", () => {
  it("loads sample trace, displays list, and toggles to graph view", async () => {
    render(<App />);
    const user = userEvent.setup();

    // Load the sample trace
    await user.click(
      screen.getByRole("button", { name: /load sample trace/i })
    );

    // Assert: We are in the "List" view by default
    // We can see the message content.
    expect(await screen.findByText(/Summarize this./i)).toBeInTheDocument();
    // The graph-specific controls should not exist
    expect(
      screen.queryByRole("button", { name: "zoom in" })
    ).not.toBeInTheDocument();

    // Act: Click the "Graph" toggle button
    await user.click(screen.getByRole("button", { name: "Graph" }));

    // Assert: The graph controls are now rendered
    expect(
      await screen.findByRole("button", { name: "Zoom In" })
    ).toBeInTheDocument();
    // The list view's detailed text is no longer visible
    // expect(screen.queryByText(/Summarize this./i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("event-list")).toBeNull()

    // Act: Click back to "List"
    await user.click(screen.getByRole("button", { name: "List" }));

    // Assert: The list view is back
    expect(screen.getByTestId("event-list")).toBeInTheDocument();
    // The graph controls are gone
    expect(
      screen.queryByRole("button", { name: "Zoom In" })
    ).not.toBeInTheDocument();
  });
});
