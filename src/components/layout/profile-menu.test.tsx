// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/ui/theme";
import { ProfileMenu } from "./profile-menu";

// The real action pulls in next-auth + Prisma, which don't resolve under
// Vite's test bundler (and shouldn't actually run in a component test anyway).
vi.mock("@/server/auth/actions", () => ({ signOutAction: vi.fn() }));

function renderMenu() {
  return render(
    <ThemeProvider initialTheme="light">
      <ProfileMenu workspaceName="Acme" email="jordan@acme.com" />
    </ThemeProvider>,
  );
}

describe("ProfileMenu", () => {
  it("opens to show Documentation, Upgrade plan, dark mode, and sign out", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /Acme/ }));

    expect(screen.getByRole("menuitem", { name: /Documentation/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Upgrade plan/ })).toBeInTheDocument();
    expect(screen.getByText("Dark mode")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("toggling dark mode does not close the menu", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /Acme/ }));
    await user.click(screen.getByRole("switch"));

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitem", { name: /Documentation/ })).toBeInTheDocument();
  });

  it("sign out is a real form submit button (works without JS-side routing)", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /Acme/ }));
    const signOutButton = screen.getByTestId("sign-out");
    expect(signOutButton).toHaveAttribute("type", "submit");
    expect(signOutButton.closest("form")).toBeInTheDocument();
  });
});
