import { readFileSync } from "node:fs";
import { type Baseline, type EvalSet, parseEvalSet } from "./types";

/** Node-only loaders for eval fixtures (used by the CLI). */
export function loadEvalSet(filePath: string): EvalSet {
  return parseEvalSet(JSON.parse(readFileSync(filePath, "utf8")));
}

export function loadBaseline(filePath: string): Baseline {
  return JSON.parse(readFileSync(filePath, "utf8")) as Baseline;
}
