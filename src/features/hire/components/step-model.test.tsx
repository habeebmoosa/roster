// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { StepModel } from "./step-model";

const OPENAI_KEY: ProviderKeyRecord = {
  id: "key-1",
  provider: "openai",
  label: null,
  baseUrl: null,
  config: {},
  createdAt: new Date("2026-01-01"),
};

describe("StepModel", () => {
  it("shows an empty state with a link to Settings when no provider is connected", () => {
    render(<StepModel providerKeys={[]} provider="" model="" onChange={vi.fn()} />);
    expect(screen.getByText("No providers connected yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/settings?tab=providers",
    );
  });

  it("lists connected providers and lets a user pick one", () => {
    render(
      <StepModel
        providerKeys={[OPENAI_KEY]}
        provider="openai"
        model="gpt-4o-mini"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("option", { name: "OpenAI" })).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("gpt-4o-mini");
  });

  it("resets the model to the new provider's first suggestion on provider change", async () => {
    const onChange = vi.fn();
    const ANTHROPIC_KEY: ProviderKeyRecord = { ...OPENAI_KEY, id: "key-2", provider: "anthropic" };
    render(
      <StepModel
        providerKeys={[OPENAI_KEY, ANTHROPIC_KEY]}
        provider="openai"
        model="gpt-4o-mini"
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Provider"), "Anthropic");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ provider: "anthropic" }));
  });

  it("calls onChange with the typed model", async () => {
    const onChange = vi.fn();
    render(
      <StepModel providerKeys={[OPENAI_KEY]} provider="openai" model="" onChange={onChange} />,
    );
    await userEvent.type(screen.getByLabelText("Model"), "x");
    expect(onChange).toHaveBeenCalledWith({ model: "x" });
  });
});
