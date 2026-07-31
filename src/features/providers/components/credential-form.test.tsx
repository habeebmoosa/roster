// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "@/core/providers/catalog";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { CredentialForm } from "./credential-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

const OPENAI = getProvider("openai")!;
const BEDROCK = getProvider("amazon-bedrock")!;

beforeEach(() => {
  refresh.mockClear();
  toast.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

describe("CredentialForm — add mode, simple bearer provider (OpenAI)", () => {
  it("submits provider, apiKey, model, and label to POST /api/providers", async () => {
    mockFetchOnce(200, { ok: true });
    const user = userEvent.setup();
    render(<CredentialForm provider={OPENAI} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText("API key"), "sk-test-123");
    await user.type(screen.getByLabelText(/Model/), "gpt-4o-mini");
    await user.type(screen.getByLabelText(/Name this credential/), "Personal");
    await user.click(screen.getByRole("button", { name: "Validate & add" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/providers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          provider: "openai",
          secrets: { apiKey: "sk-test-123" },
          baseUrl: undefined,
          label: "Personal",
          config: {},
          model: "gpt-4o-mini",
          makeDefault: false,
        }),
      }),
    );
  });

  it("shows the make-default toggle only when the provider already has credentials", () => {
    render(<CredentialForm provider={OPENAI} onClose={vi.fn()} />);
    expect(screen.queryByText("Make this the default")).not.toBeInTheDocument();

    render(<CredentialForm provider={OPENAI} hasExistingCredentials onClose={vi.fn()} />);
    expect(screen.getByText("Make this the default")).toBeInTheDocument();
  });

  it("shows an error message and does not close on a rejected request", async () => {
    mockFetchOnce(400, { error: { message: "The API key was rejected." } });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CredentialForm provider={OPENAI} onClose={onClose} />);

    await user.type(screen.getByLabelText("API key"), "sk-bad");
    await user.type(screen.getByLabelText(/Model/), "gpt-4o-mini");
    await user.click(screen.getByRole("button", { name: "Validate & add" }));

    await waitFor(() => expect(screen.getByText("The API key was rejected.")).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("CredentialForm — add mode, multi-secret provider (AWS Bedrock)", () => {
  it("renders every secret and config field and bundles them into `secrets`/`config`", async () => {
    mockFetchOnce(200, { ok: true });
    const user = userEvent.setup();
    render(<CredentialForm provider={BEDROCK} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText("Access key ID"), "AKIA123");
    await user.type(screen.getByLabelText("Secret access key"), "shh-secret");
    await user.type(screen.getByLabelText(/AWS region/), "us-east-1");
    await user.type(screen.getByLabelText(/Model/), "anthropic.claude-3-5-sonnet-20241022-v2:0");
    await user.click(screen.getByRole("button", { name: "Validate & add" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.secrets).toEqual({
      accessKeyId: "AKIA123",
      secretAccessKey: "shh-secret",
      sessionToken: "",
    });
    expect(body.config).toEqual({ region: "us-east-1" });
  });
});

describe("CredentialForm — edit mode", () => {
  const EXISTING: ProviderKeyRecord = {
    id: "cred-1",
    provider: "openai",
    label: "Work",
    isDefault: true,
    baseUrl: "https://my-proxy.example.com/v1",
    config: {},
    createdAt: new Date("2026-01-01"),
  };

  it("prefills label and base URL, and leaves the secret field blank", () => {
    render(<CredentialForm provider={OPENAI} existing={EXISTING} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Name this credential/)).toHaveValue("Work");
    expect(screen.getByLabelText(/Base URL/)).toHaveValue("https://my-proxy.example.com/v1");
    expect(screen.getByLabelText("API key")).toHaveValue("");
  });

  it("submits a PATCH without `secrets` when the secret field is left blank", async () => {
    mockFetchOnce(200, { ok: true, credential: EXISTING });
    const user = userEvent.setup();
    render(<CredentialForm provider={OPENAI} existing={EXISTING} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText(/Name this credential/));
    await user.type(screen.getByLabelText(/Name this credential/), "Renamed");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/providers/openai/credentials/cred-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          label: "Renamed",
          secrets: undefined,
          baseUrl: "https://my-proxy.example.com/v1",
          config: {},
          model: undefined,
        }),
      }),
    );
  });

  it("requires all secret fields together for a multi-secret provider — filling only one is rejected client-side", async () => {
    const user = userEvent.setup();
    render(<CredentialForm provider={BEDROCK} existing={EXISTING} onClose={vi.fn()} />);

    // Region is a required non-secret field, independent of the secret-bundling
    // check under test — fill it so native HTML validation doesn't block submit.
    await user.type(screen.getByLabelText(/AWS region/), "us-east-1");
    await user.type(screen.getByLabelText("Access key ID"), "AKIA-new");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText(/To replace the credential, fill in all of/),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
