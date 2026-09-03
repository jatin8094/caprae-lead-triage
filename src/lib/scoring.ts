import { ICPConfig, RawLeadRow, ScoreBreakdown } from "@/types/lead";

/**
 * ICP-fit scoring engine.
 *
 * Design intent (see README §"Why scoring, not just scraping"):
 * SaaSquatch surfaces raw leads; the highest-leverage feature for a rep is
 * knowing which 20 of 2,000 rows to call first. We score 0-100 across four
 * weighted dimensions and bucket into hot/warm/cold tiers so triage is a
 * single sort, not a spreadsheet exercise.
 */

const WEIGHTS = {
  titleFit: 35,
  industryFit: 25,
  sizeFit: 20,
  dataQuality: 20,
};

export function parseEmployeeCount(raw?: string | number | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return raw;

  const rangeMatch = raw.match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1].replace(/,/g, ""), 10);
    const hi = parseInt(rangeMatch[2].replace(/,/g, ""), 10);
    return Math.round((lo + hi) / 2);
  }
  const plusMatch = raw.match(/(\d[\d,]*)\s*\+/);
  if (plusMatch) return parseInt(plusMatch[1].replace(/,/g, ""), 10);

  const plain = raw.replace(/[^\d.]/g, "");
  return plain ? Math.round(parseFloat(plain)) : null;
}

function scoreTitleFit(title: string | undefined, icp: ICPConfig): number {
  if (!title) return 0;
  const t = title.toLowerCase();
  const isDecisionMaker = icp.targetTitles.some((kw) => t.includes(kw.toLowerCase()));
  if (isDecisionMaker) return WEIGHTS.titleFit;

  // Partial credit for adjacent seniority signals (director/lead/manager)
  const seniorSignals = ["director", "lead", "manager", "vp", "chief", "head"];
  if (seniorSignals.some((s) => t.includes(s))) return Math.round(WEIGHTS.titleFit * 0.5);

  return Math.round(WEIGHTS.titleFit * 0.15);
}

function scoreIndustryFit(industry: string | undefined, icp: ICPConfig): number {
  if (!industry) return 0;
  const i = industry.toLowerCase();
  const isMatch = icp.targetIndustries.some((kw) => i.includes(kw.toLowerCase()));
  return isMatch ? WEIGHTS.industryFit : Math.round(WEIGHTS.industryFit * 0.2);
}

function scoreSizeFit(employeeCount: number | null, icp: ICPConfig): number {
  if (employeeCount === null) return Math.round(WEIGHTS.sizeFit * 0.3);
  if (employeeCount >= icp.minEmployees && employeeCount <= icp.maxEmployees) return WEIGHTS.sizeFit;

  // Distance-based partial credit so near-misses aren't zeroed out
  const distance =
    employeeCount < icp.minEmployees
      ? icp.minEmployees - employeeCount
      : employeeCount - icp.maxEmployees;
  const span = icp.maxEmployees - icp.minEmployees || 1;
  const penalty = Math.min(1, distance / span);
  return Math.round(WEIGHTS.sizeFit * (1 - penalty) * 0.6);
}

function scoreDataQuality(row: RawLeadRow): number {
  const fields = [row.email, row.linkedinUrl, row.title, row.domain, row.fullName];
  const present = fields.filter((f) => f && f.trim().length > 0).length;
  return Math.round((present / fields.length) * WEIGHTS.dataQuality);
}

export function scoreLead(
  row: RawLeadRow,
  icp: ICPConfig
): { score: number; tier: "hot" | "warm" | "cold"; breakdown: ScoreBreakdown } {
  const employeeCount = parseEmployeeCount(row.employeeCount ?? row.employees);

  const breakdown: ScoreBreakdown = {
    titleFit: scoreTitleFit(row.title, icp),
    industryFit: scoreIndustryFit(row.industry, icp),
    sizeFit: scoreSizeFit(employeeCount, icp),
    dataQuality: scoreDataQuality(row),
  };

  const score = breakdown.titleFit + breakdown.industryFit + breakdown.sizeFit + breakdown.dataQuality;
  const tier = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  return { score, tier, breakdown };
}
