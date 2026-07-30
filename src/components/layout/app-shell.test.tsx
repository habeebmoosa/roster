// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/ui/theme";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// See profile-menu.test.tsx: the real action's import chain doesn't resolve
// under Vite's test bundler and shouldn't run in a component test anyway.
vi.mock("@/server/auth/actions", () => ({ signOutAction: vi.fn() }));

function renderShell() {
  return render(
    <ThemeProvider initialTheme="light">
      <AppShell workspaceName="Acme" email="jordan@acme.com">
        <p>Page content</p>
      </AppShell>
    </ThemeProvider>,
  );
}

describe("AppShell", () => {
  it("renders page content", () => {
    renderShell();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("opens the mobile nav drawer from the menu button", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    // The profile menu's feedback Modal is also a role="dialog" element (a
    // native <dialog>) — query the Drawer's own div[role="dialog"] specifically
    // to avoid ambiguity between the two.
    const drawerWrapper = container.querySelector('div[role="dialog"]')!.parentElement!;
    expect(drawerWrapper).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(drawerWrapper).toHaveAttribute("aria-hidden", "false");
  });
});
