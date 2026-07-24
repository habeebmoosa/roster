// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ConnectorGroup } from "../types";
import { ConnectorsBoard } from "./connectors-board";

const GROUPS: ConnectorGroup[] = [
  {
    category: "Knowledge & docs",
    items: [
      { id: "google-drive", name: "Google Drive", description: "Search files." },
      { id: "notion", name: "Notion", description: "Pull pages." },
    ],
  },
  {
    category: "Communication",
    items: [{ id: "slack", name: "Slack", description: "Post updates." }],
  },
];

describe("ConnectorsBoard", () => {
  it("renders every category and connector", () => {
    render(<ConnectorsBoard groups={GROUPS} />);
    expect(screen.getByText("Knowledge & docs")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });

  it("starts with the default-connected ids already showing Manage/Connected", () => {
    render(<ConnectorsBoard groups={GROUPS} />);
    // google-drive and notion are in DEFAULT_CONNECTED_IDS; slack is not.
    const manageButtons = screen.getAllByRole("button", { name: "Manage" });
    expect(manageButtons).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("toggles a connector's connected state on click, independently of the others", async () => {
    const user = userEvent.setup();
    render(<ConnectorsBoard groups={GROUPS} />);

    const slackCard = screen.getByTestId("connector-slack");
    const notionCard = screen.getByTestId("connector-notion");

    await user.click(within(slackCard).getByRole("button", { name: "Connect" }));
    expect(within(slackCard).getByRole("button", { name: "Manage" })).toBeInTheDocument();
    // Notion is untouched.
    expect(within(notionCard).getByRole("button", { name: "Manage" })).toBeInTheDocument();

    await user.click(within(notionCard).getByRole("button", { name: "Manage" }));
    expect(within(notionCard).getByRole("button", { name: "Connect" })).toBeInTheDocument();
    // Slack stays connected — toggles are independent.
    expect(within(slackCard).getByRole("button", { name: "Manage" })).toBeInTheDocument();
  });
});
