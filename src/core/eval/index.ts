export {
  parseEvalSet,
  evalSetSchema,
  type EvalSet,
  type EvalTask,
  type Grader,
  type EvalCaseResult,
  type EvalTierResult,
  type Baseline,
} from "./types";
export { grade, type GradeResult, type GradeContext } from "./graders";
export {
  runEval,
  runEvalTier,
  type EvalTier,
  type RunEvalInput,
  type RetrieveFn,
  type RetrievalResult,
} from "./runner";
export { checkGate, type GateResult, type GateRegression } from "./gate";
export {
  computeLatestOverallSuccessRate,
  type EvalRunSample,
  type OverallSuccessRate,
} from "./overall-success-rate";
// Note: loader.ts (node fs) is intentionally not re-exported — import it from
// "@/core/eval/loader" in the CLI only.
