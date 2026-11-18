import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DataMeta, JobRecord } from "../lib/types";

const root = resolve(import.meta.dirname, "..");
const jobs = JSON.parse(await readFile(resolve(root, "public/data/jobs.json"), "utf8")) as JobRecord[];
const meta = JSON.parse(await readFile(resolve(root, "public/data/meta.json"), "utf8")) as DataMeta;

const problems: string[] = [];
if (jobs.length < 300) problems.push(`jobs < 300: ${jobs.length}`);

// URL 校验：仅允许 http/https，并按 source 约束域名形态（Task 5 M4）。
const GREENHOUSE_BOARD_HOSTS = new Set(["boards.greenhouse.io", "job-boards.greenhouse.io"]);
for (const job of jobs) {
  let url: URL | null = null;
  try {
    url = new URL(job.sourceUrl);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    problems.push(`sourceUrl is not http(s): ${job.id} -> ${job.sourceUrl}`);
    continue;
  }
  if (job.source !== "greenhouse") continue;
  // Greenhouse 的 absolute_url 有两类：官方 board 域名，或企业自有域名内嵌 gh_jid 参数。
  const host = url.hostname;
  const isGreenhouseHost = host === "greenhouse.io" || host.endsWith(".greenhouse.io");
  const canonicalBoard = GREENHOUSE_BOARD_HOSTS.has(host);
  const embeddedBoard = !isGreenhouseHost && url.searchParams.has("gh_jid");
  if (!canonicalBoard && !embeddedBoard) {
    problems.push(`greenhouse sourceUrl host not whitelisted: ${job.id} -> ${job.sourceUrl}`);
  }
}

if (!jobs.every((job) => job.lastSeenAt)) problems.push("some jobs have no lastSeenAt");
if (jobs.some((job) => job.type !== "internship")) problems.push("non-internship job present");
const ids = new Set<string>();
for (const job of jobs) {
  if (ids.has(job.id)) problems.push(`duplicate id: ${job.id}`);
  ids.add(job.id);
}
if (meta.total !== jobs.length) problems.push(`meta.total ${meta.total} != jobs ${jobs.length}`);

// I1（生产数据安全）：拦截 NCSS fixture 降级数据混入真实快照。
const FIXTURE_MARKERS = ["降级示例", "示例数据"];
const NCSS_DETAIL_URL = /^https:\/\/m\.ncss\.cn\/student\/jobs\/[^/]+\/detail\.html$/;
for (const job of jobs) {
  if (job.source !== "ncss") continue;
  if (job.id === "ncss-fixture-1") {
    problems.push(`ncss fixture record present: ${job.id}`);
    continue;
  }
  const text = `${job.sourceDetail ?? ""} ${job.description}`;
  if (FIXTURE_MARKERS.some((marker) => text.includes(marker))) {
    problems.push(`ncss record contains fixture marker text: ${job.id}`);
  }
  if (!/^ncss-.+$/.test(job.id)) {
    problems.push(`ncss id not in ncss-<jobId> form: ${job.id}`);
  }
  if (!NCSS_DETAIL_URL.test(job.sourceUrl)) {
    problems.push(`ncss sourceUrl is not a real detail URL: ${job.id} -> ${job.sourceUrl}`);
  }
}

console.log(JSON.stringify({ total: jobs.length, sources: meta.sources, problems }, null, 2));
if (problems.length) process.exitCode = 1;
