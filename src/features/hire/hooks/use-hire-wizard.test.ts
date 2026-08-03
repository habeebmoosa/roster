// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHireWizard } from "./use-hire-wizard";

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

describe("useHireWizard", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    toast.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts on step 1 with no role selected, blocking Continue", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    expect(result.current.step).toBe(1);
    expect(result.current.canContinue).toBe(false);
  });

  it("applying a role template fills the form and unblocks step 1", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.applyTemplate("customer-support"));

    expect(result.current.form.name).toBe("Ada — Customer Support");
    expect(result.current.form.abilities).toContain("kb_lookup");
    expect(result.current.canContinue).toBe(true);
  });

  it("advances and rewinds steps with next()/back()", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.applyTemplate("custom"));
    act(() => result.current.next());
    expect(result.current.step).toBe(2);
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it("does not advance past a step whose validation fails", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    // Step 1 has no role selected yet — canContinue is false.
    act(() => result.current.next());
    expect(result.current.step).toBe(1);
  });

  it("step 2 requires name/role/identity/voice before continuing", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.applyTemplate("custom"));
    act(() => result.current.next());
    expect(result.current.step).toBe(2);
    expect(result.current.canContinue).toBe(false);

    act(() =>
      result.current.patch({ name: "Bo", role: "Ops", identity: "Sharp.", voice: "Direct." }),
    );
    expect(result.current.canContinue).toBe(true);
  });

  it("re-applying the already-selected template does not clobber later edits", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.applyTemplate("custom"));
    act(() => result.current.patch({ name: "Bo Ops" }));
    act(() => result.current.applyTemplate("custom"));
    expect(result.current.form.name).toBe("Bo Ops");
  });

  it("switching to a different template does overwrite the form", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.applyTemplate("custom"));
    act(() => result.current.patch({ name: "Bo Ops" }));
    act(() => result.current.applyTemplate("content-writer"));
    expect(result.current.form.name).toBe("Content Writer");
  });

  it("toggleAbility adds and removes an ability id", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.toggleAbility("web_search"));
    expect(result.current.form.abilities).toEqual(["web_search"]);
    act(() => result.current.toggleAbility("web_search"));
    expect(result.current.form.abilities).toEqual([]);
  });

  it("toggleConnector adds and removes a connector id", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.toggleConnector("linear"));
    expect(result.current.form.connectorIds).toEqual(["linear"]);
    act(() => result.current.toggleConnector("linear"));
    expect(result.current.form.connectorIds).toEqual([]);
  });

  it("step 6 requires a provider and model before continuing", () => {
    const { result } = renderHook(() => useHireWizard(""));
    // Force step to 6 by stepping through with valid data along the way.
    act(() => result.current.applyTemplate("customer-support"));
    for (let i = 0; i < 5; i++) act(() => result.current.next());
    expect(result.current.step).toBe(6);
    expect(result.current.canContinue).toBe(false);

    act(() => result.current.patch({ provider: "openai", model: "gpt-4o-mini" }));
    expect(result.current.canContinue).toBe(true);
  });

  it("generatedId slugifies the current name", () => {
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.patch({ name: "Ada — Customer Support" }));
    expect(result.current.generatedId).toBe("ada-customer-support");
  });

  it("saveAndExit persists the draft to sessionStorage, restored on next mount", () => {
    const { result, unmount } = renderHook(() => useHireWizard("openai"));
    act(() => result.current.patch({ name: "Persisted Name" }));
    act(() => result.current.saveAndExit());
    unmount();

    const { result: restored } = renderHook(() => useHireWizard("openai"));
    expect(restored.current.form.name).toBe("Persisted Name");
  });

  it("submit() posts the definition and clears the draft on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "bo-ops" }), { status: 201 })),
    );
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() =>
      result.current.patch({
        name: "Bo Ops",
        role: "Ops",
        identity: "Sharp.",
        voice: "Direct.",
        provider: "openai",
        model: "gpt-4o-mini",
      }),
    );
    act(() => result.current.saveAndExit());

    let outcome: { ok: true; id: string } | { ok: false } = { ok: false };
    await act(async () => {
      outcome = await result.current.submit();
    });

    expect(outcome).toEqual({ ok: true, id: "bo-ops" });
    expect(window.sessionStorage.getItem("roster:hire-wizard-draft")).toBeNull();
  });

  it("submit() enables each selected connector for the newly created employee", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "bo-ops" }), { status: 201 }))
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() =>
      result.current.patch({
        name: "Bo Ops",
        role: "Ops",
        identity: "Sharp.",
        voice: "Direct.",
        connectorIds: ["linear", "notion"],
        provider: "openai",
        model: "gpt-4o-mini",
      }),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agents/bo-ops/connectors/linear",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agents/bo-ops/connectors/notion",
      expect.objectContaining({ method: "POST" }),
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it("submit() still succeeds and warns via toast when a connector fails to enable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "bo-ops" }), { status: 201 }))
      .mockResolvedValue(new Response(JSON.stringify({ error: {} }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useHireWizard("openai"));
    act(() =>
      result.current.patch({
        name: "Bo Ops",
        role: "Ops",
        identity: "Sharp.",
        voice: "Direct.",
        connectorIds: ["linear"],
        provider: "openai",
        model: "gpt-4o-mini",
      }),
    );

    let outcome: { ok: true; id: string } | { ok: false } = { ok: false };
    await act(async () => {
      outcome = await result.current.submit();
    });

    expect(outcome).toEqual({ ok: true, id: "bo-ops" });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "danger" }));
  });

  it("submit() surfaces a server error and leaves submitting false", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Already exists." } }), { status: 409 }),
        ),
    );
    const { result } = renderHook(() => useHireWizard("openai"));

    let outcome: { ok: true; id: string } | { ok: false } = { ok: true, id: "x" };
    await act(async () => {
      outcome = await result.current.submit();
    });

    expect(outcome).toEqual({ ok: false });
    expect(result.current.submitError).toBe("Already exists.");
    expect(result.current.submitting).toBe(false);
  });
});
