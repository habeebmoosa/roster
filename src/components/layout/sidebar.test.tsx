// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/ui/theme";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Sidebar renders ProfileMenu, whose real sign-out action's import chain
// (next-auth + Prisma) doesn't resolve under Vite's test bundler.
vi.mock("@/server/auth/actions", () => ({ signOutAction: vi.fn() }));

function renderSidebar() {
  return render(
    <ThemeProvider initialTheme="light">
      <Sidebar workspaceName="Acme" email="jordan@acme.com" />
    </ThemeProvider>,
  );
}

describe("Sidebar", () => {
  it("marks the active route via aria-current", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: /Workers/ })).not.toHaveAttribute("aria-current");
  });

  it("renders Workers as a real link now that /workers exists", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Workers/ })).toHaveAttribute("href", "/workers");
  });

  it("renders Connectors as a real link now that /connectors exists", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Connectors/ })).toHaveAttribute("href", "/connectors");
    expect(screen.queryByText("Soon")).not.toBeInTheDocument();
  });

  it("shows the workspace name and email in the profile trigger", () => {
    renderSidebar();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("jordan@acme.com")).toBeInTheDocument();
  });
});
