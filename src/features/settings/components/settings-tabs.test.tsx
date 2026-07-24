// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsTabs, isSettingsTabValue } from "./settings-tabs";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function renderTabs(initialTab: string) {
  return render(
    <SettingsTabs
      initialTab={initialTab}
      workspace={<p>Workspace content</p>}
      profile={<p>Profile content</p>}
      providers={<p>Providers content</p>}
      apiKeys={<p>API keys content</p>}
      billing={<p>Billing content</p>}
    />,
  );
}

describe("isSettingsTabValue", () => {
  it("accepts the known tab values", () => {
    expect(isSettingsTabValue("providers")).toBe(true);
    expect(isSettingsTabValue("bogus")).toBe(false);
  });
});

describe("SettingsTabs", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("shows the panel matching a valid initial tab", () => {
    renderTabs("providers");
    expect(screen.getByText("Providers content")).toBeInTheDocument();
    expect(screen.queryByText("Workspace content")).not.toBeInTheDocument();
  });

  it("falls back to Workspace for an invalid initial tab", () => {
    renderTabs("not-a-real-tab");
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
  });

  it("switches panels on click and syncs the URL via router.replace", async () => {
    const user = userEvent.setup();
    renderTabs("workspace");

    await user.click(screen.getByRole("tab", { name: "API keys" }));

    expect(screen.getByText("API keys content")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/settings?tab=api-keys", { scroll: false });
  });
});
