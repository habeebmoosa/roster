// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Connector } from "../types";
import { ConnectorCard } from "./connector-card";

const SLACK: Connector = {
  id: "slack",
  name: "Slack",
  description: "Let employees post updates and read channel context.",
};

describe("ConnectorCard", () => {
  it("shows Connect and no badge when not connected", () => {
    render(<ConnectorCard connector={SLACK} connected={false} onToggle={() => {}} />);
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText(SLACK.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  });

  it("shows the Connected badge and a Manage button when connected", () => {
    render(<ConnectorCard connector={SLACK} connected={true} onToggle={() => {}} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage" })).toBeInTheDocument();
  });

  it("calls onToggle when the button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ConnectorCard connector={SLACK} connected={false} onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
