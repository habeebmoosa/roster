// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProviderPickerGrid } from "./provider-picker-grid";

describe("ProviderPickerGrid", () => {
  it("groups providers under category headings", () => {
    render(<ProviderPickerGrid onSelect={vi.fn()} />);
    expect(screen.getByText("Frontier")).toBeInTheDocument();
    expect(screen.getByText("Enterprise & cloud")).toBeInTheDocument();
    expect(screen.getByText("Self-hosted")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("AWS Bedrock")).toBeInTheDocument();
  });

  it("filters providers by the search query", async () => {
    const user = userEvent.setup();
    render(<ProviderPickerGrid onSelect={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Search providers…"), "bedrock");

    expect(screen.getByText("AWS Bedrock")).toBeInTheDocument();
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
  });

  it("shows a no-match message for a query with no hits", async () => {
    const user = userEvent.setup();
    render(<ProviderPickerGrid onSelect={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Search providers…"), "totally-not-a-provider");

    expect(screen.getByText(/No providers match/)).toBeInTheDocument();
  });

  it("calls onSelect with the chosen provider's catalog entry", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ProviderPickerGrid onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "OpenAI" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "openai", label: "OpenAI" }));
  });
});
