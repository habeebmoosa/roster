// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissToast, toast, useToasts } from "./use-toast";

describe("toast store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a toast that the hook picks up, and returns its id", () => {
    const { result } = renderHook(() => useToasts());

    let id = "";
    act(() => {
      id = toast({ title: "Saved" }, 0);
    });

    expect(id).toBeTruthy();
    expect(result.current.some((t) => t.id === id && t.title === "Saved")).toBe(true);
  });

  it("auto-dismisses after the given duration", () => {
    const { result } = renderHook(() => useToasts());

    let id = "";
    act(() => {
      id = toast({ title: "Auto-dismiss me" }, 1000);
    });
    expect(result.current.some((t) => t.id === id)).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.some((t) => t.id === id)).toBe(false);
  });

  it("does not auto-dismiss when durationMs is 0", () => {
    const { result } = renderHook(() => useToasts());

    let id = "";
    act(() => {
      id = toast({ title: "Sticky" }, 0);
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.some((t) => t.id === id)).toBe(true);

    act(() => {
      dismissToast(id);
    });
    expect(result.current.some((t) => t.id === id)).toBe(false);
  });
});
