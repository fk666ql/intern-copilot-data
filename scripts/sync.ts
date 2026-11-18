import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchGreenhouseJobs, type CompanyConfig } from "./adapters/greenhouse";
import { fetchNcssJobs } from "./adapters/ncss";
import { dedupeJobs } from "./dedupe";
import { mergeSourceJobs } from "./merge";
import { sortJobs } from "./normalize";
import type { DataMeta, JobRecord } from "../lib/types";

const root = resolve(import.meta.dirname, "..");
const dataDir = resolve(root, "public/data");
const jobsPath = resolve(dataDir, "jobs.json");
const metaPath = resolve(dataDir, "meta.json");
const companiesPath = resolve(root, "config/companies.json");

async function readPreviousJobs(): Promise<JobRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(jobsPath, "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as JobRecord[]) : [];
  } catch {
    return [];
  }
}

async function main() {
  const started = Date.now();
  const companies = JSON.parse(await readFile(companiesPath, "utf8")) as CompanyConfig[];
  const previous = await readPreviousJobs();
  const errors: string[] = [];
  const [ncss, greenhouse] = await Promise.all([
    // I1（生产数据安全）：绝不传 useFixtureOnFailure，
    // 禁止 fixture 降级数据混入真实岗位快照；失败就如实记录 error。
    fetchNcssJobs({ maxPages: 10, enrichLimit: 100 }).catch((error) => ({
      jobs: [] as JobRecord[],
      error: error instanceof Error ? error.message : "ncss failed",
    })),
    fetchGreenhouseJobs(companies).catch((error) => ({
      jobs: [] as JobRecord[],
      errors: [error instanceof Error ? error.message : "greenhouse failed"],
    })),
  ]);
  if ("error" in ncss && ncss.error) errors.push(`NCSS: ${ncss.error}`);
  if ("errors" in greenhouse) errors.push(...greenhouse.errors);

  const ncssFailed = "error" in ncss && Boolean(ncss.error);
  const greenhouseFailed = "errors" in greenhouse && greenhouse.errors.length > 0;
  const ncssMerged = mergeSourceJobs(
    ncss.jobs,
    previous.filter((job) => job.source === "ncss"),
    ncssFailed,
  );
  const greenhouseMerged = mergeSourceJobs(
    greenhouse.jobs,
    previous.filter((job) => job.source === "greenhouse"),
    greenhouseFailed,
  );
  const bothStale = ncssMerged.stale && greenhouseMerged.stale;
  if (bothStale) {
    throw new Error("All sources failed; keeping the previous snapshot without updating meta.");
  }

  const all = dedupeJobs([...ncssMerged.jobs, ...greenhouseMerged.jobs]);
  if (all.length === 0) {
    throw new Error("No jobs fetched; keeping the previous snapshot.");
  }
  const jobs = sortJobs(all).slice(0, 800);
  const meta: DataMeta = {
    generatedAt: new Date().toISOString(),
    total: jobs.length,
    sources: [
      {
        name: "NCSS 国家大学生就业服务平台",
        count: ncssMerged.jobs.length,
        ok: !ncssFailed,
        stale: ncssMerged.stale || undefined,
        error: ncssFailed ? ("error" in ncss ? ncss.error : undefined) : undefined,
      },
      {
        name: "Greenhouse 企业直发",
        count: greenhouseMerged.jobs.length,
        ok: !greenhouseFailed,
        stale: greenhouseMerged.stale || undefined,
        error: greenhouseFailed
          ? ("errors" in greenhouse ? greenhouse.errors.join("; ") : undefined)
          : undefined,
      },
    ],
  };
  await mkdir(dataDir, { recursive: true });
  await writeFile(jobsPath, JSON.stringify(jobs, null, 2), "utf8");
  await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log(`synced ${jobs.length} jobs in ${Date.now() - started}ms`);
  console.log(
    `sources: NCSS ${ncssMerged.jobs.length}${ncssMerged.stale ? " (stale)" : ""}, ` +
      `Greenhouse ${greenhouseMerged.jobs.length}${greenhouseMerged.stale ? " (stale)" : ""}`,
  );
  if (errors.length) console.warn(`partial errors: ${errors.join(" | ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

