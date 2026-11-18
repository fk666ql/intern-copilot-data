import { extractSkills } from "../../lib/skills";
import type { JobRecord } from "../../lib/types";
import { sha256 } from "../lib/hash";
import { fetchWithRetry, sleep } from "../lib/http";
import { htmlToText } from "../lib/html";

export interface CompanyConfig {
  name: string;
  token: string;
  ats: string;
}

interface GreenhouseRaw {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  content?: string;
}

const INTERN_PATTERN = /\bintern(ship)?\b|实习|co-?op/i;

export function isInternshipTitle(title: string): boolean {
  return INTERN_PATTERN.test(title);
}

export function mapGreenhouseJob(
  company: CompanyConfig,
  raw: GreenhouseRaw,
  now: Date,
): JobRecord {
  const locationName = raw.location?.name?.trim() ?? "";
  const city = locationName.split(/[,•|]/)[0]?.trim() ?? "";
  const remote = /remote/i.test(locationName);
  const description = htmlToText(raw.content ?? "").slice(0, 6000);
  return {
    id: `gh-${company.token}-${raw.id}`,
    source: "greenhouse",
    sourceName: `${company.name} Careers`,
    sourceUrl: raw.absolute_url,
    trust: "L2",
    sources: [
      {
        source: "greenhouse",
        sourceName: `${company.name} Careers`,
        sourceUrl: raw.absolute_url,
        trust: "L2",
      },
    ],
    company: {
      name: company.name,
      normalizedName: company.name.toLowerCase(),
    },
    title: raw.title.trim(),
    type: "internship",
    location: { city, remote },
    requirements: {
      skills: extractSkills(`${raw.title} ${description}`),
      majors: [],
      languages: [],
    },
    description,
    postedAt: raw.first_published ?? raw.updated_at,
    lastSeenAt: now.toISOString(),
    rawHash: sha256(raw),
  };
}

export async function fetchGreenhouseJobs(
  companies: CompanyConfig[],
  now = new Date(),
): Promise<{ jobs: JobRecord[]; errors: string[] }> {
  const jobs: JobRecord[] = [];
  const errors: string[] = [];
  for (const company of companies.filter((item) => item.ats === "greenhouse")) {
    try {
      const response = await fetchWithRetry(
        `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; InternCopilot/1.0)",
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as { jobs?: GreenhouseRaw[] };
      const matched = (json.jobs ?? []).filter((raw) => isInternshipTitle(raw.title));
      jobs.push(...matched.map((raw) => mapGreenhouseJob(company, raw, now)));
    } catch (error) {
      errors.push(`${company.name}: ${error instanceof Error ? error.message : "failed"}`);
    }
    await sleep(250);
  }
  return { jobs, errors };
}
