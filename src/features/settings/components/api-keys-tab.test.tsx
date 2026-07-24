// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiKeysTab } from "./api-keys-tab";

describe("ApiKeysTab", () => {
  it("shows the initial fixture key", () => {
    render(<ApiKeysTab />);
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("creates a new key from the modal and adds it to the list", async () => {
    const user = userEvent.setup();
    render(<ApiKeysTab />);

    await user.click(screen.getByRole("button", { name: "+ Create API key" }));
    await user.type(screen.getByPlaceholderText("e.g. Production"), "Staging");
    await user.click(screen.getByRole("button", { name: "Create key" }));

    expect(screen.getByText("Staging")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("revokes a key, removing it from the list", async () => {
    const user = userEvent.setup();
    render(<ApiKeysTab />);

    expect(screen.getByText("Production")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    expect(screen.queryByText("Production")).not.toBeInTheDocument();
  });

  it("shows an empty state once every key has been revoked", async () => {
    const user = userEvent.setup();
    render(<ApiKeysTab />);
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    expect(screen.getByText("No API keys yet")).toBeInTheDocument();
  });
});
