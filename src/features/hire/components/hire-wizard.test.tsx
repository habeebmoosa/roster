// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { HireWizard } from "./hire-wizard";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const OPENAI_KEY: ProviderKeyRecord = {
  id: "key-1",
  provider: "openai",
  label: null,
  baseUrl: null,
  config: {},
  createdAt: new Date("2026-01-01"),
};

describe("HireWizard", () => {
  beforeEach(() => {
    push.mockClear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("walks all 6 steps for a templated role and creates the employee", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "ada-customer-support" }), { status: 201 }),
        ),
    );
    const user = userEvent.setup();
    render(<HireWizard providerKeys={[OPENAI_KEY]} />);

    // Step 1 — Role
    expect(screen.getByText("What role is this employee for?")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Ada — Customer Support/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2 — Basics (prefilled by the template)
    expect(screen.getByText("Basic details")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Ada — Customer Support");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3 — Knowledge (fixture, always continuable)
    expect(screen.getByText("Knowledge base")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4 — Abilities
    expect(screen.getByRole("heading", { name: "Abilities" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 5 — Provider & model
    expect(screen.getByText("Provider & model")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(screen.getByLabelText("Model"), "gpt-4o-mini");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 6 — Review & create
    expect(screen.getByText("Review & create")).toBeInTheDocument();
    expect(screen.getByText("/workers/ada-customer-support")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create employee" }));

    expect(await screen.findByRole("button", { name: "Create employee" })).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/workers/ada-customer-support");

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agents",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({
      id: "ada-customer-support",
      name: "Ada — Customer Support",
      model: { provider: "openai", model: "gpt-4o-mini" },
    });
  });

  it("Back returns to the previous step without losing entered data", async () => {
    const user = userEvent.setup();
    render(<HireWizard providerKeys={[OPENAI_KEY]} />);

    await user.click(screen.getByRole("radio", { name: /Start from scratch/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Name"), "Bo Ops");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("What role is this employee for?")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Start from scratch/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Bo Ops");
  });

  it("Save & exit persists the draft and navigates to /workers", async () => {
    const user = userEvent.setup();
    render(<HireWizard providerKeys={[OPENAI_KEY]} />);

    await user.click(screen.getByRole("button", { name: "Save & exit" }));
    expect(push).toHaveBeenCalledWith("/workers");
    expect(window.sessionStorage.getItem("roster:hire-wizard-draft")).not.toBeNull();
  });

  it("shows an empty state on the model step when no provider is connected", async () => {
    const user = userEvent.setup();
    render(<HireWizard providerKeys={[]} />);

    await user.click(screen.getByRole("radio", { name: /Start from scratch/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Name"), "Bo");
    await user.type(screen.getByLabelText("Role title"), "Ops");
    await user.type(screen.getByLabelText("Identity"), "Sharp.");
    await user.type(screen.getByLabelText("Voice"), "Direct.");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("No providers connected yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
