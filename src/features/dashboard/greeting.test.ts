import { describe, expect, it } from "vitest";
import { getGreeting } from "./greeting";

function at(hour: number): Date {
  const d = new Date(2026, 0, 1, hour, 0, 0);
  return d;
}

describe("getGreeting", () => {
  it("says good morning before noon", () => {
    expect(getGreeting(at(9))).toBe("Good morning");
  });

  it("says good afternoon from noon to before 6pm", () => {
    expect(getGreeting(at(12))).toBe("Good afternoon");
    expect(getGreeting(at(17))).toBe("Good afternoon");
  });

  it("says good evening from 6pm onward", () => {
    expect(getGreeting(at(18))).toBe("Good evening");
    expect(getGreeting(at(23))).toBe("Good evening");
  });
});
