import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom";

import App from "../App";

describe("App", () => {
  it("loads the sample trace and displays events", async () => {
    render(<App />);

    await userEvent.click(
      screen.getByRole("button", { name: /load sample trace/i })
    );

    expect(await screen.findByText(/AccordKit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/message/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/sample-trace\.jsonl/i)).toBeInTheDocument();
  });
});
