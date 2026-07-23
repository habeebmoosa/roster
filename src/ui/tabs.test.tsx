// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "./tabs";

function ExampleTabs(props: Partial<React.ComponentProps<typeof Tabs>> = {}) {
  return (
    <Tabs defaultValue="about" {...props}>
      <TabsList>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsPanel value="about">About content</TabsPanel>
      <TabsPanel value="activity">Activity content</TabsPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows the default panel and marks its trigger selected", () => {
    render(<ExampleTabs />);
    expect(screen.getByText("About content")).toBeInTheDocument();
    expect(screen.queryByText("Activity content")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "About" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches panels when a trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<ExampleTabs />);

    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(screen.getByText("Activity content")).toBeInTheDocument();
    expect(screen.queryByText("About content")).not.toBeInTheDocument();
  });

  it("supports controlled mode via value/onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ExampleTabs value="about" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(onValueChange).toHaveBeenCalledWith("activity");
    // Controlled: parent didn't update `value`, so panel stays on "about".
    expect(screen.getByText("About content")).toBeInTheDocument();
  });
});
