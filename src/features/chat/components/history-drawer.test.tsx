// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConversationSummary } from "../types";
import { HistoryDrawer } from "./history-drawer";

const CONVERSATIONS: ConversationSummary[] = [
  {
    id: "customer-support-0",
    employeeId: "customer-support",
    employeeName: "Ada — Customer Support",
    title: "Refund for order #48213",
    date: "Today",
  },
];

describe("HistoryDrawer", () => {
  it("shows an empty state when there is no history", () => {
    render(<HistoryDrawer open={true} onClose={() => {}} conversations={[]} onSelect={() => {}} />);
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("renders each conversation's title and employee/date line", () => {
    render(
      <HistoryDrawer
        open={true}
        onClose={() => {}}
        conversations={CONVERSATIONS}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("Refund for order #48213")).toBeInTheDocument();
    expect(screen.getByText("Ada — Customer Support · Today")).toBeInTheDocument();
  });

  it("calls onSelect with the conversation's own id when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <HistoryDrawer
        open={true}
        onClose={() => {}}
        conversations={CONVERSATIONS}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByText("Refund for order #48213"));
    expect(onSelect).toHaveBeenCalledWith("customer-support-0");
  });
});
