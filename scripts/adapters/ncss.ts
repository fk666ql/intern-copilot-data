import { parse } from "node-html-parser";
import { extractSkills } from "../../lib/skills";
import type { JobRecord } from "../../lib/types";
import { sha256 } from "../lib/hash";
import { htmlToText } from "../lib/html";
import { fetchWithRetry, sleep } from "../lib/http";

const LIST_URL = "https://www.ncss.cn/student/jobs/jobslist/ajax/";
const DETAIL_URL = "https://m.ncss.cn/student/jobs/{id}/detail.html";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Referer: "https://www.ncss.cn/student/jobs/index.html",
  Accept: "application/json, text/plain, */*",
};

interface NcssRaw {
  jobName?: string;
  recName?: string;
  areaCodeName?: string;
  jobId?: string;
  publishDate?: number;
  degreeName?: string;
  recScale?: string;
  sourcesNameCh?: string;
  lowMonthPay?: number;
  highMonthPay?: number;
  major?: string;
  recProperty?: string;
}

const FALLBACK_RAW: NcssRaw = {
  jobName: "数据分析实习生",
  recName: "示例科技（上海）有限公司",
  areaCodeName: "上海",
  jobId: "fixture-1",
  publishDate: 1794708000000,
  degreeName: "本科及以上",
  recScale: "500-999人",
  sourcesNameCh: "示例大学",
  lowMonthPay: 3,
  highMonthPay: 5,
  major: "计算机类,统计学类",
  recProperty: "民营企业",
};

export function normalizeCompanyName(name: string): string {
  return name
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/(有限责任公司|股份有限公司|有限公司|集团有限公司|集团)$/g, "")
    .toLowerCase();
}

export function parseNcssDetail(html: string): {
  title?: string;
  companyName?: string;
  description: string;
} {
  const root = parse(html);
  const title = root.querySelector("#jobName")?.textContent.trim();
  const companyName = root.querySelector("#realCorpName")?.textContent.trim();
  const content = root.querySelector(".jobdetail-box .mainContent")?.innerHTML ?? "";
  return {
    title,
    companyName,
    description: htmlToText(content),
  };
}

export function mapNcssItem(raw: NcssRaw, detailText: string, now: Date): JobRecord {
  const title = (raw.jobName ?? "未命名岗位").trim();
  const companyName = (raw.recName ?? "未知公司").trim();
  const city = (raw.areaCodeName ?? "").trim();
  const jobId = String(raw.jobId ?? "");
  const skills = extractSkills([title, raw.major ?? "", detailText].join(" "));
  const low = Number(raw.lowMonthPay ?? 0);
  const high = Number(raw.highMonthPay ?? 0);
  return {
    id: `ncss-${jobId || sha256(raw).slice(0, 12)}`,
    source: "ncss",
    sourceName: "国家大学生就业服务平台",
    sourceDetail: raw.sourcesNameCh?.trim() || undefined,
    sourceUrl: DETAIL_URL.replace("{id}", jobId),
    trust: "L1",
    sources: [
      {
        source: "ncss",
        sourceName: "国家大学生就业服务平台",
        sourceUrl: DETAIL_URL.replace("{id}", jobId),
        trust: "L1",
      },
    ],
    company: {
      name: companyName,
      normalizedName: normalizeCompanyName(companyName),
      size: raw.recScale?.trim() || undefined,
      type: raw.recProperty?.trim() || undefined,
    },
    title,
    type: "internship",
    location: { city },
    stipend:
      high > 0
        ? { min: low > 0 ? low * 1000 : undefined, max: high * 1000, unit: "month" }
        : undefined,
    requirements: {
      education: raw.degreeName?.trim() || undefined,
      majors: raw.major ? raw.major.split(/[,，]/).map((item) => item.trim()).filter(Boolean) : [],
      skills,
      languages: [],
    },
    description: detailText.slice(0, 6000),
    postedAt: raw.publishDate ? new Date(raw.publishDate).toISOString() : undefined,
    lastSeenAt: now.toISOString(),
    rawHash: sha256(raw),
  };
}

export async function fetchNcssJobs(options: {
  maxPages?: number;
  enrichLimit?: number;
  now?: Date;
  useFixtureOnFailure?: boolean;
} = {}): Promise<{ jobs: JobRecord[]; error?: string }> {
  const maxPages = options.maxPages ?? 10;
  const enrichLimit = options.enrichLimit ?? 80;
  const now = options.now ?? new Date();
  const raws: NcssRaw[] = [];
  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const url = new URL(LIST_URL);
      url.searchParams.set("jobType", "03");
      url.searchParams.set("offset", String(page - 1));
      url.searchParams.set("limit", "20");
      const response = await fetchWithRetry(url.toString(), { headers: HEADERS });
      if (!response.ok) throw new Error(`NCSS list HTTP ${response.status}`);
      const json = (await response.json()) as {
        data?: { list?: NcssRaw[]; pagenation?: { total?: number } };
      };
      const list = json.data?.list ?? [];
      raws.push(...list);
      const totalPages = json.data?.pagenation?.total ?? 0;
      if (list.length === 0 || page >= totalPages) break;
      await sleep(400);
    }
  } catch (error) {
    if (options.useFixtureOnFailure) {
      raws.push(FALLBACK_RAW);
    } else {
      return { jobs: [], error: error instanceof Error ? error.message : "NCSS list failed" };
    }
  }

  const seen = new Set<string>();
  const unique = raws.filter((raw) => {
    const key = String(raw.jobId ?? "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const jobs: JobRecord[] = [];
  for (let index = 0; index < unique.length; index += 1) {
    const raw = unique[index];
    let description = "";
    if (index < enrichLimit && raw.jobId) {
      try {
        const response = await fetchWithRetry(
          DETAIL_URL.replace("{id}", raw.jobId),
          { headers: { ...HEADERS, Accept: "text/html" } },
        );
        if (response.ok) {
          const detail = parseNcssDetail(await response.text());
          description = detail.description;
          if (detail.title) raw.jobName = detail.title;
          if (detail.companyName) raw.recName = detail.companyName;
        }
      } catch {
        // 单个详情失败不影响列表入库
      }
      await sleep(350);
    }
    jobs.push(mapNcssItem(raw, description, now));
  }
  return { jobs };
}
