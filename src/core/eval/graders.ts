import type { Grader } from "./types";

export interface GradeResult {
  passed: boolean;
  failures: string[];
}

/** Grade an output against a task's graders. All graders must pass. */
export function grade(output: string, graders: Grader[]): GradeResult {
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
    }
  }

  return { passed: failures.length === 0, failures };
}
