// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProviderCatalog } from "@/core/providers/catalog";
import { hasProviderLogo, ProviderLogo } from "./provider-logo";

describe("ProviderLogo", () => {
  it("has a real vendor logo mapped for every catalog provider except custom", () => {
    for (const entry of getProviderCatalog()) {
      if (entry.id === "custom") {
        expect(hasProviderLogo(entry.id)).toBe(false);
      } else {
        expect(hasProviderLogo(entry.id)).toBe(true);
      }
    }
  });

  it("renders an <img> pointing at /logos/{id}.svg for a known provider, decorative (empty alt) by default", () => {
    const { container } = render(<ProviderLogo id="openai" label="OpenAI" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/logos/openai.svg");
    expect(img).toHaveAttribute("alt", "");
  });

  it("uses the label as real alt text when explicitly not decorative", () => {
    const { container } = render(<ProviderLogo id="openai" label="OpenAI" decorative={false} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "OpenAI");
  });

  it("falls back to a generic icon (no <img>) for an unknown/custom provider", () => {
    const { container } = render(<ProviderLogo id="custom" label="Custom" />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
