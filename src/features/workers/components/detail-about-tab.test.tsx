// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailAboutTab } from "./detail-about-tab";

describe("DetailAboutTab", () => {
  it("renders identity, the quoted voice, expertise, abilities, and activity", () => {
    render(
      <DetailAboutTab
        identity="Calm and precise."
        voice="Warm but concise."
        expertise={["de-escalation", "policy interpretation"]}
        abilities={["kb_lookup", "escalate_ticket"]}
        recentActivity={[{ text: "Resolved a refund request", time: "12m ago" }]}
      />,
    );

    expect(screen.getByText("Calm and precise.")).toBeInTheDocument();
    expect(screen.getByText(/Warm but concise\./)).toBeInTheDocument();
    expect(screen.getByText("de-escalation")).toBeInTheDocument();
    expect(screen.getByText("kb_lookup")).toBeInTheDocument();
    expect(screen.getByText("Resolved a refund request")).toBeInTheDocument();
    expect(screen.getByText("12m ago")).toBeInTheDocument();
  });

  it("omits the expertise/abilities sections when empty", () => {
    render(
      <DetailAboutTab identity="i" voice="v" expertise={[]} abilities={[]} recentActivity={[]} />,
    );
    expect(screen.queryByText("Expertise")).not.toBeInTheDocument();
    expect(screen.queryByText("Abilities")).not.toBeInTheDocument();
  });
});
