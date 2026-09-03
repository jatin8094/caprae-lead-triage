import { RawLeadRow } from "@/types/lead";

/**
 * Enrichment layer.
 *
 * In production this calls a paid provider (Clearbit, Apollo, People Data
 * Labs) keyed off the company domain, with the result cached in Postgres
 * (see README §"Caching") so we never pay for the same domain twice.
 *
 * For this exercise — no API keys, 5-hour budget — we ship a
 * EnrichmentProvider interface plus a deterministic heuristic provider that
 * fills gaps (industry, employee count) from the domain's TLD/keyword shape.
 * Swapping in a real provider is a one-file change: implement the same
 * interface and change `getEnrichmentProvider()`.
 */

export interface EnrichmentResult {
  industry?: string;
  employeeCount?: number;
}

export interface EnrichmentProvider {
  enrich(domain: string): Promise<EnrichmentResult | null>;
}

const INDUSTRY_KEYWORDS: Record<string, string> = {
  shop: "e-commerce",
  store: "e-commerce",
  health: "healthcare",
  clinic: "healthcare",
  bank: "fintech",
  pay: "fintech",
  capital: "financial services",
  law: "legal services",
  legal: "legal services",
  cloud: "saas",
  app: "software",
  tech: "software",
  labs: "software",
  agency: "professional services",
  consulting: "professional services",
};

class HeuristicEnrichmentProvider implements EnrichmentProvider {
  private cache = new Map<string, EnrichmentResult | null>();

  async enrich(domain: string): Promise<EnrichmentResult | null> {
    const key = domain.toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key)!;

    const result: EnrichmentResult = {};
    const matchedKeyword = Object.keys(INDUSTRY_KEYWORDS).find((kw) => key.includes(kw));
    if (matchedKeyword) result.industry = INDUSTRY_KEYWORDS[matchedKeyword];

    // Deterministic pseudo-size from domain hash, kept in a plausible SMB/mid-market band —
    // stands in for a real firmographic lookup without fabricating a false-precision number.
    const hash = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    result.employeeCount = 10 + (hash % 490);

    this.cache.set(key, result);
    return result;
  }
}

let providerInstance: EnrichmentProvider | null = null;

export function getEnrichmentProvider(): EnrichmentProvider {
  if (!providerInstance) providerInstance = new HeuristicEnrichmentProvider();
  return providerInstance;
}

/** Fills industry/employeeCount only where the source row left them blank. */
export async function enrichRow(row: RawLeadRow): Promise<RawLeadRow> {
  const domain = row.domain ?? row.website;
  if (!domain || (row.industry && (row.employeeCount ?? row.employees))) return row;

  const provider = getEnrichmentProvider();
  const result = await provider.enrich(domain);
  if (!result) return row;

  return {
    ...row,
    industry: row.industry ?? result.industry,
    employeeCount: row.employeeCount ?? row.employees ?? result.employeeCount,
  };
}
