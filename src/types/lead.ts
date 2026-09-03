export interface RawLeadRow {
  fullName?: string;
  name?: string;
  title?: string;
  company?: string;
  companyName?: string;
  domain?: string;
  website?: string;
  industry?: string;
  employeeCount?: string | number;
  employees?: string | number;
  email?: string;
  linkedinUrl?: string;
  linkedin?: string;
  location?: string;
}

export interface ScoreBreakdown {
  titleFit: number;
  industryFit: number;
  sizeFit: number;
  dataQuality: number;
}

export interface ScoredLead {
  fullName: string;
  title: string | null;
  company: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  email: string | null;
  linkedinUrl: string | null;
  location: string | null;
  score: number;
  tier: "hot" | "warm" | "cold";
  scoreBreakdown: ScoreBreakdown;
  isDuplicate: boolean;
  duplicateOfId: string | null;
}

export interface ICPConfig {
  targetTitles: string[];       // seniority/role keywords, e.g. ["founder", "vp sales", "head of"]
  targetIndustries: string[];   // e.g. ["saas", "e-commerce", "fintech"]
  minEmployees: number;
  maxEmployees: number;
}

export const DEFAULT_ICP: ICPConfig = {
  targetTitles: ["founder", "ceo", "owner", "vp sales", "head of sales", "cro", "director of sales"],
  targetIndustries: ["saas", "software", "e-commerce", "fintech", "professional services"],
  minEmployees: 10,
  maxEmployees: 500,
};
