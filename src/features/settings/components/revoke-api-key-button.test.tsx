// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevokeApiKeyButton } from "./revoke-api-key-button";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RevokeApiKeyButton", () => {
  it("DELETEs the key and refreshes the router", async () => {
    const user = userEvent.setup();
    render(<RevokeApiKeyButton id="key-1" />);

    await user.click(screen.getByRole("button", { name: "Revoke" }));

    expect(fetch).toHaveBeenCalledWith("/api/api-keys/key-1", { method: "DELETE" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("encodes the id in the URL", async () => {
    const user = userEvent.setup();
    render(<RevokeApiKeyButton id="key/with slash" />);

    await user.click(screen.getByRole("button", { name: "Revoke" }));

    expect(fetch).toHaveBeenCalledWith(`/api/api-keys/${encodeURIComponent("key/with slash")}`, {
      method: "DELETE",
    });
  });
});
