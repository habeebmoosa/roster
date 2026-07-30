import { tool } from "ai";
import { z } from "zod";

/**
 * A hand-rolled, dependency-free arithmetic evaluator — deliberately not backed by any
 * expression-parsing library. Tool-call arguments come from model output, which can be
 * influenced by prompt injection, so this only ever does arithmetic: no `eval`/`Function`,
 * no property access, no way to reach an object or its prototype.
 */

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: (x) => Math.sqrt(x!),
  abs: (x) => Math.abs(x!),
  round: (x) => Math.round(x!),
  floor: (x) => Math.floor(x!),
  ceil: (x) => Math.ceil(x!),
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
  log: (x) => Math.log(x!),
  exp: (x) => Math.exp(x!),
};

type TokenType = "number" | "identifier" | "+" | "-" | "*" | "/" | "^" | "(" | ")" | "," | "eof";

interface Token {
  type: TokenType;
  value: string;
}

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",
  "^": "^",
  "(": "(",
  ")": ")",
  ",": ",",
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    const singleCharType = SINGLE_CHAR_TOKENS[char];
    if (singleCharType) {
      tokens.push({ type: singleCharType, value: char });
      i++;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j]!)) j++;
      const numText = input.slice(i, j);
      if (!/^\d+(\.\d+)?$/.test(numText)) {
        throw new Error(`Invalid number literal: "${numText}"`);
      }
      tokens.push({ type: "number", value: numText });
      i = j;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let j = i;
      while (j < input.length && /[a-zA-Z]/.test(input[j]!)) j++;
      tokens.push({ type: "identifier", value: input.slice(i, j) });
      i = j;
      continue;
    }

    throw new Error(`Unexpected character "${char}" at position ${i}`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private consume(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected "${type}" but got "${token.type}"`);
    }
    this.pos++;
    return token;
  }

  parse(): number {
    const result = this.parseExpression();
    this.consume("eof");
    return result;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    for (;;) {
      if (this.peek().type === "+") {
        this.pos++;
        value += this.parseTerm();
      } else if (this.peek().type === "-") {
        this.pos++;
        value -= this.parseTerm();
      } else {
        return value;
      }
    }
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    for (;;) {
      if (this.peek().type === "*") {
        this.pos++;
        value *= this.parseUnary();
      } else if (this.peek().type === "/") {
        this.pos++;
        const divisor = this.parseUnary();
        if (divisor === 0) throw new Error("Division by zero");
        value /= divisor;
      } else {
        return value;
      }
    }
  }

  private parseUnary(): number {
    if (this.peek().type === "-") {
      this.pos++;
      return -this.parseUnary();
    }
    if (this.peek().type === "+") {
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    if (this.peek().type === "^") {
      this.pos++;
      const exponent = this.parseUnary();
      return Math.pow(base, exponent);
    }
    return base;
  }

  private parsePrimary(): number {
    const token = this.peek();

    if (token.type === "number") {
      this.pos++;
      return Number.parseFloat(token.value);
    }

    if (token.type === "(") {
      this.pos++;
      const value = this.parseExpression();
      this.consume(")");
      return value;
    }

    if (token.type === "identifier") {
      this.pos++;
      const name = token.value.toLowerCase();
      if (!Object.hasOwn(FUNCTIONS, name)) {
        throw new Error(`Unknown function "${token.value}"`);
      }
      const fn = FUNCTIONS[name]!;
      this.consume("(");
      const args: number[] = [];
      if (this.peek().type !== ")") {
        args.push(this.parseExpression());
        while (this.peek().type === ",") {
          this.pos++;
          args.push(this.parseExpression());
        }
      }
      this.consume(")");
      return fn(...args);
    }

    throw new Error(`Unexpected token "${token.type}"`);
  }
}

/** Evaluates a bounded arithmetic grammar: +,-,*,/,^, parentheses, and a fixed function whitelist. Never reaches `eval`/`Function`. */
export function evaluateExpression(expression: string): number {
  const tokens = tokenize(expression);
  const result = new Parser(tokens).parse();
  if (!Number.isFinite(result)) {
    throw new Error("Result is not a finite number");
  }
  return result;
}

export const calculate = tool({
  description:
    "Evaluate an arithmetic expression. Supports +, -, *, /, ^ (power), parentheses, and the functions sqrt, abs, round, floor, ceil, min, max, log, exp.",
  inputSchema: z.object({
    expression: z
      .string()
      .min(1)
      .describe("The arithmetic expression to evaluate, e.g. '(2 + 3) * 4'"),
  }),
  execute: async ({ expression }) => {
    return { result: evaluateExpression(expression) };
  },
});
