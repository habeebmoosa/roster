// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProfileTab } from "./profile-tab";

describe("ProfileTab", () => {
  it("shows the real name and email as read-only", () => {
    render(<ProfileTab name="Jordan Lee" email="jordan@acme.com" />);
    const nameInput = screen.getByDisplayValue("Jordan Lee");
    const emailInput = screen.getByDisplayValue("jordan@acme.com");
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
  });

  it("disables password/2FA controls with honest OAuth-only copy", () => {
    render(<ProfileTab name="Jordan Lee" email="jordan@acme.com" />);
    expect(screen.getByRole("button", { name: "Change password" })).toBeDisabled();
    expect(screen.getByText(/there's no separate Roster password/)).toBeInTheDocument();
  });

  it("Delete account opens a confirmation with the destructive action disabled", async () => {
    const user = userEvent.setup();
    render(<ProfileTab name="Jordan Lee" email="jordan@acme.com" />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByText("Delete account?")).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole("button", { name: "Delete account" });
    expect(confirmButtons[1]).toBeDisabled();
  });
});
