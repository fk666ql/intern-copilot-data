export const SKILL_ALIASES: Record<string, string[]> = {
  SQL: ["sql", "mysql", "postgresql", "hive", "clickhouse"],
  Python: ["python", "pandas", "numpy"],
  Excel: ["excel", "vlookup", "数据透视表", "透视表"],
  数据分析: ["数据分析", "data analysis", "数据洞察", "商业分析"],
  Tableau: ["tableau"],
  PowerBI: ["power bi", "powerbi"],
  机器学习: ["机器学习", "machine learning", "sklearn", "pytorch", "tensorflow"],
  "A/B测试": ["a/b测试", "ab测试", "a/b test", "ab test", "实验设计", "a/b 测试"],
  统计分析: ["统计学", "统计分析", "假设检验", "回归分析"],
  Java: ["java", "spring boot"],
  JavaScript: ["javascript", "typescript", "js", "ts"],
  React: ["react", "next.js", "nextjs"],
  Vue: ["vue", "nuxt"],
  "C++": ["c++", "cpp"],
  Figma: ["figma"],
  Photoshop: ["photoshop", "ps"],
  剪辑: ["剪辑", "premiere", "final cut", "剪映"],
  文案: ["文案", "copywriting", "内容运营", "脚本"],
  产品设计: ["产品设计", "产品经理", "需求分析", "prd", "用户研究"],
  运营: ["运营", "用户增长", "社群运营", "活动运营"],
  英语: ["英语", "english", "cet-6", "雅思", "托福"],
};

function hasAsciiAlias(text: string, alias: string): boolean {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z]|$)`, "i").test(text);
}

function includesAlias(text: string, alias: string): boolean {
  if (/^[a-z0-9+#./ -]+$/i.test(alias)) return hasAsciiAlias(text, alias);
  return text.includes(alias);
}

export function canonicalSkill(value: string): string {
  const text = value.trim();
  if (!text) return "";
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (includesAlias(text, canonical) || aliases.some((alias) => includesAlias(text, alias))) {
      return canonical;
    }
  }
  return text;
}

export function extractSkills(text: string): string[] {
  const source = text.toLowerCase();
  const result: string[] = [];
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (includesAlias(source, canonical) || aliases.some((alias) => includesAlias(source, alias))) {
      result.push(canonical);
    }
  }
  return result;
}

export function matchSkills(jobText: string, profileSkills: string[]) {
  const wanted = extractSkills(jobText);
  const owned = new Set(profileSkills.map(canonicalSkill));
  return {
    matched: wanted.filter((skill) => owned.has(skill)),
    missing: wanted.filter((skill) => !owned.has(skill)),
    all: wanted,
  };
}
