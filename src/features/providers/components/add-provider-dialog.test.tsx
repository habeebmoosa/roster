// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddProviderDialog } from "./add-provider-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AddProviderDialog", () => {
  it("starts on the provider picker (step 1)", () => {
    render(<AddProviderDialog onClose={vi.fn()} />);
    expect(screen.getByText("Add a provider")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search providers…")).toBeInTheDocument();
  });

  it("advances to the credential form (step 2) after picking a provider", async () => {
    const user = userEvent.setup();
    render(<AddProviderDialog onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "OpenAI" }));

    expect(screen.getByLabelText("API key")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("Back returns to the provider picker", async () => {
    const user = userEvent.setup();
    render(<AddProviderDialog onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "OpenAI" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByPlaceholderText("Search providers…")).toBeInTheDocument();
  });

  it("the close button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddProviderDialog onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
