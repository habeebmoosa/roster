import type { Grader } from "./types";

export interface GradeResult {
  passed: boolean;
  failures: string[];
}

export interface GradeContext {
  /** Source uris actually retrieved for this case (only set on grounded runs). */
  retrievedSourceUris?: string[];
}

/** Grade an output against a task's graders. All graders must pass. */
export function grade(output: string, graders: Grader[], context: GradeContext = {}): GradeResult {
  const haystack = output.toLowerCase();
  const failures: string[] = [];

  for (const grader of graders) {
    switch (grader.type) {
      case "includes": {
        const missing = grader.values.filter((v) => !haystack.includes(v.toLowerCase()));
        if (missing.length > 0) failures.push(`missing: ${missing.join(", ")}`);
        break;
      }
      case "excludes": {
        const present = grader.values.filter((v) => haystack.includes(v.toLowerCase()));
        if (present.length > 0) failures.push(`should not contain: ${present.join(", ")}`);
        break;
      }
      case "regex": {
        if (!new RegExp(grader.pattern, "i").test(output)) {
          failures.push(`did not match /${grader.pattern}/i`);
        }
        break;
      }
      case "retrieval": {
        const retrieved = context.retrievedSourceUris ?? [];
        const retrievedSet = new Set(retrieved);
        const expectedSet = new Set(grader.expectedSourceUris);

        const hits = grader.expectedSourceUris.filter((uri) => retrievedSet.has(uri));
        const recall = hits.length / grader.expectedSourceUris.length;
        const precisionHits = retrieved.filter((uri) => expectedSet.has(uri));
        const precision = retrieved.length === 0 ? 0 : precisionHits.length / retrieved.length;

        if (recall < grader.minRecall) {
          failures.push(
            `retrieval recall ${recall.toFixed(2)} < required ${grader.minRecall} ` +
              `(expected: ${grader.expectedSourceUris.join(", ")}; got: ${retrieved.join(", ") || "none"})`,
          );
        }
        if (precision < grader.minPrecision) {
          failures.push(
            `retrieval precision ${precision.toFixed(2)} < required ${grader.minPrecision} ` +
              `(got: ${retrieved.join(", ") || "none"})`,
          );
        }
        break;
      }
    }
  }

  return { passed: failures.length === 0, failures };
}
