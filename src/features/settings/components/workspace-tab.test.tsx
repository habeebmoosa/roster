// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/ui/theme";
import { WorkspaceTab } from "./workspace-tab";

function renderTab() {
  return render(
    <ThemeProvider initialTheme="light">
      <WorkspaceTab initialName="Acme Workspace" />
    </ThemeProvider>,
  );
}

describe("WorkspaceTab", () => {
  it("pre-fills the workspace name field", () => {
    renderTab();
    expect(screen.getByDisplayValue("Acme Workspace")).toBeInTheDocument();
  });

  it("renders a working theme toggle", async () => {
    const user = userEvent.setup();
    renderTab();
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("Delete workspace opens a confirmation with the destructive action disabled", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole("button", { name: "Delete workspace" }));

    expect(screen.getByText("Delete workspace?")).toBeInTheDocument();
    expect(screen.getByText(/nothing will actually be deleted/)).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: "Delete workspace" });
    // The second one is inside the modal's confirmation footer.
    expect(confirmButtons[1]).toBeDisabled();
  });
});
