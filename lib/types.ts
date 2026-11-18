export type TrustLevel = "L1" | "L2" | "L3";
export type JobSource =
  | "ncss"
  | "guopin"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "import";
export type JobType = "internship" | "campus" | "fulltime";
export type Tier = "stretch" | "match" | "safe" | "reject";
export type Degree = "大专" | "本科" | "硕士" | "博士";

export interface Company {
  name: string;
  normalizedName: string;
  website?: string;
  industry?: string;
  size?: string;
  type?: string;
}

export interface JobLocation {
  city: string;
  district?: string;
  remote?: boolean;
}

export interface Stipend {
  min?: number;
  max?: number;
  unit: "day" | "month" | "hour" | "unknown";
  negotiable?: boolean;
}

export interface JobRequirements {
  education?: string;
  majors?: string[];
  skills: string[];
  languages?: string[];
  graduationYear?: string;
}

export interface JobSourceRef {
  source: JobSource;
  sourceName: string;
  sourceUrl: string;
  trust: TrustLevel;
}

export interface JobRecord {
  id: string;
  source: JobSource;
  sourceName: string;
  sourceUrl: string;
  sourceDetail?: string;
  trust: TrustLevel;
  sources?: JobSourceRef[];
  company: Company;
  title: string;
  type: JobType;
  location: JobLocation;
  stipend?: Stipend;
  duration?: string;
  daysPerWeek?: number;
  requirements: JobRequirements;
  description: string;
  postedAt?: string;
  deadline?: string;
  lastSeenAt: string;
  rawHash: string;
  importedAt?: string;
}

export interface Profile {
  name: string;
  school: string;
  major: string;
  degree: Degree;
  graduationYear: number;
  cities: string[];
  startDate: string;
  durationMonths: number;
  daysPerWeek: number;
  skills: string[];
  industries: string[];
  companyTypes: string[];
  minStipend?: number;
  remoteOk: boolean;
  projects: string;
}

export interface MatchBreakdown {
  hard: number;
  skill: number;
  experience: number;
  preference: number;
}

export interface MatchResult {
  jobId: string;
  score: number;
  tier: Tier;
  hardPass: boolean;
  reasons: string[];
  gaps: string[];
  confidence: "high" | "medium" | "low";
  breakdown: MatchBreakdown;
}

export interface RiskSignal {
  code: string;
  label: string;
  severity: "high" | "medium" | "low";
  evidence: string;
  suggestion: string;
}

export interface PortfolioItem {
  jobId: string;
  tier: Exclude<Tier, "reject">;
  reason: string;
  gap?: string;
}

export interface PortfolioWeek {
  key: "this-week" | "next-week" | "later" | "rolling" | "overdue";
  label: string;
  jobIds: string[];
}

export interface Portfolio {
  items: PortfolioItem[];
  counts: { stretch: number; match: number; safe: number };
  weeks: PortfolioWeek[];
  actions: string[];
  notes: string[];
}

export interface RequirementRow {
  requirement: string;
  sourceQuote: string;
  evidence: string;
  gap: string;
  action: string;
}

export interface WeekPlan {
  week: number;
  goal: string;
  tasks: string[];
  deliverable: string;
}

export interface PrepPlan {
  jobId: string;
  rows: RequirementRow[];
  weeks: WeekPlan[];
}

export interface ResumeBullet {
  original: string;
  suggestion: string;
  keywords: string[];
  warning?: string;
}

export interface ResumeAnalysis {
  bullets: ResumeBullet[];
  covered: string[];
  missing: string[];
  guardrails: string[];
}

export type TrackerStatus =
  | "todo"
  | "applied"
  | "test"
  | "interview"
  | "offer"
  | "archived";

export interface TrackerEntry {
  jobId: string;
  status: TrackerStatus;
  appliedAt?: string;
  nextAction?: string;
  nextActionAt?: string;
  notes?: string;
}

export interface DataMeta {
  generatedAt: string;
  total: number;
  sources: {
    name: string;
    count: number;
    ok: boolean;
    stale?: boolean;
    error?: string;
  }[];
}
