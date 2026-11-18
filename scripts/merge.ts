import type { JobRecord } from "../lib/types";

export function mergeSourceJobs(
  fresh: JobRecord[],
  previous: JobRecord[],
  failed: boolean,
): { jobs: JobRecord[]; stale: boolean } {
  if (failed && previous.length > 0) return { jobs: previous, stale: true };
  return { jobs: fresh, stale: false };
}
