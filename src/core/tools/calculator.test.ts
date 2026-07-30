import { describe, expect, it } from "vitest";
import { calculate, evaluateExpression } from "./calculator";
import { callTool } from "./test-helpers";

describe("evaluateExpression", () => {
  it("evaluates basic arithmetic with correct precedence", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("10 / 2 - 1")).toBe(4);
  });

  it("supports exponents, right-associatively", () => {
    expect(evaluateExpression("2 ^ 3")).toBe(8);
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(2 ** (3 ** 2));
  });

  it("supports unary minus and plus", () => {
    expect(evaluateExpression("-5 + 3")).toBe(-2);
    expect(evaluateExpression("-(2 + 3)")).toBe(-5);
    expect(evaluateExpression("+5")).toBe(5);
  });

  it("supports whitelisted functions", () => {
    expect(evaluateExpression("sqrt(16)")).toBe(4);
    expect(evaluateExpression("abs(-7)")).toBe(7);
    expect(evaluateExpression("max(1, 5, 3)")).toBe(5);
    expect(evaluateExpression("min(1, 5, 3)")).toBe(1);
    expect(evaluateExpression("round(2.6)")).toBe(3);
  });

  it("rejects division by zero", () => {
    expect(() => evaluateExpression("1 / 0")).toThrow(/division by zero/i);
  });

  it("rejects unknown functions", () => {
    expect(() => evaluateExpression("eval(1)")).toThrow(/unknown function/i);
  });

  it("rejects malformed expressions", () => {
    expect(() => evaluateExpression("2 + ")).toThrow();
    expect(() => evaluateExpression("(2 + 3")).toThrow();
    expect(() => evaluateExpression("2 + + )")).toThrow();
  });

  it("rejects unexpected characters, never falling back to eval semantics", () => {
    expect(() => evaluateExpression("process.exit()")).toThrow();
    expect(() => evaluateExpression("__proto__")).toThrow(/unexpected character/i);
    expect(() => evaluateExpression("2; 3")).toThrow();
  });

  it("rejects Object.prototype member names, never resolving them via the prototype chain", () => {
    expect(() => evaluateExpression("constructor()")).toThrow(/unknown function/i);
    expect(() => evaluateExpression("toString()")).toThrow(/unknown function/i);
    expect(() => evaluateExpression("hasOwnProperty()")).toThrow(/unknown function/i);
    expect(() => evaluateExpression("valueOf()")).toThrow(/unknown function/i);
  });
});

describe("calculate tool", () => {
  it("evaluates an expression via the tool's execute function", async () => {
    const result = await callTool(calculate, { expression: "(2 + 3) * 4" });
    expect(result).toEqual({ result: 20 });
  });
});
