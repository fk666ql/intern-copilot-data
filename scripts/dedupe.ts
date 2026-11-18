import type { JobRecord, JobSourceRef } from "../lib/types";
import { jobDedupeKey, trustRank } from "./normalize";

function mergeSources(sources: JobSourceRef[]): JobSourceRef[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.source}|${source.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeJobs(jobs: JobRecord[]): JobRecord[] {
  const map = new Map<string, JobRecord>();
  for (const job of jobs) {
    const key = jobDedupeKey(job);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, job);
      continue;
    }
    const primary = trustRank(job.trust) > trustRank(existing.trust) ? job : existing;
    const secondary = primary === job ? existing : job;
    map.set(key, {
      ...primary,
      sources: mergeSources([
        ...(primary.sources ?? []),
        ...(secondary.sources ?? []),
        {
          source: secondary.source,
          sourceName: secondary.sourceName,
          sourceUrl: secondary.sourceUrl,
          trust: secondary.trust,
        },
      ]),
    });
  }
  return [...map.values()];
}
