// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./tooltip";

describe("Tooltip", () => {
  it("is hidden until hovered, then shows the label", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="New chat">
        <button>Icon</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("New chat");
  });

  it("positions above the trigger by default", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Send">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip").className).toContain("bottom-full");
  });

  it("positions below the trigger with side=\"bottom\" — for a control near the top of the viewport, where an above-positioned tooltip would clip", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="History" side="bottom">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button"));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("top-full");
    expect(tooltip.className).not.toContain("bottom-full");
  });
});
