import type { JobRecord } from "../lib/types";

export function normalizeTitle(title: string): string {
  return title
    .replace(/\s+/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/实习生|实习|校招|校园招聘|2027|2026/g, "")
    .toLowerCase();
}

export function jobDedupeKey(job: JobRecord): string {
  return [
    job.company.normalizedName,
    normalizeTitle(job.title),
    job.location.city.replace(/[省市区县]/g, ""),
  ].join("|");
}

export function trustRank(trust: JobRecord["trust"]): number {
  return { L1: 3, L2: 2, L3: 1 }[trust];
}

export function sortJobs(jobs: JobRecord[]): JobRecord[] {
  return [...jobs].sort((a, b) => {
    const aTime = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const bTime = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return bTime - aTime;
  });
}
