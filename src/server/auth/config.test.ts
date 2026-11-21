import { describe, expect, it } from "vitest";
import { enabledSignInProviders } from "./config";

describe("enabledSignInProviders", () => {
  it("returns only providers with both credentials set", () => {
    expect(enabledSignInProviders({})).toEqual([]);
    expect(enabledSignInProviders({ GOOGLE_CLIENT_ID: "a" })).toEqual([]);
    expect(enabledSignInProviders({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" })).toEqual([
      "google",
    ]);
  });

  it("lists google before github when both are configured", () => {
    expect(
      enabledSignInProviders({
        GOOGLE_CLIENT_ID: "a",
        GOOGLE_CLIENT_SECRET: "b",
        GITHUB_CLIENT_ID: "c",
        GITHUB_CLIENT_SECRET: "d",
      }),
    ).toEqual(["google", "github"]);
  });
});
