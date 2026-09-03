import { RawLeadRow } from "@/types/lead";

/**
 * Deduplication.
 *
 * Two leads are considered duplicates when:
 *  1. Emails match exactly (case-insensitive), OR
 *  2. Same normalized company domain AND same normalized full name
 *     (catches re-scrapes of the same contact from a different source
 *     with a slightly different title/casing).
 *
 * We keep the *highest-scoring* record of each duplicate cluster and flag
 * the rest — reps see one row per real human, not five.
 */

function normalizeDomain(domain?: string): string | null {
  if (!domain) return null;
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim() || null;
}

function normalizeName(name?: string): string | null {
  if (!name) return null;
  return name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim() || null;
}

export interface DedupeInput extends RawLeadRow {
  _tempId: string;
  _score: number;
}

export interface DedupeResult {
  _tempId: string;
  isDuplicate: boolean;
  duplicateOfTempId: string | null;
}

export function dedupeLeads(rows: DedupeInput[]): DedupeResult[] {
  const results: DedupeResult[] = rows.map((r) => ({
    _tempId: r._tempId,
    isDuplicate: false,
    duplicateOfTempId: null,
  }));

  const byEmail = new Map<string, DedupeInput[]>();
  const byDomainName = new Map<string, DedupeInput[]>();

  for (const row of rows) {
    if (row.email) {
      const key = row.email.toLowerCase().trim();
      byEmail.set(key, [...(byEmail.get(key) ?? []), row]);
    }
    const domain = normalizeDomain(row.domain ?? row.website);
    const name = normalizeName(row.fullName ?? row.name);
    if (domain && name) {
      const key = `${domain}::${name}`;
      byDomainName.set(key, [...(byDomainName.get(key) ?? []), row]);
    }
  }

  const resultMap = new Map(results.map((r) => [r._tempId, r]));

  const applyCluster = (cluster: DedupeInput[]) => {
    if (cluster.length < 2) return;
    const sorted = [...cluster].sort((a, b) => b._score - a._score);
    const winner = sorted[0];
    for (const loser of sorted.slice(1)) {
      const entry = resultMap.get(loser._tempId)!;
      // Don't downgrade a decision made by a higher-confidence signal (email)
      if (!entry.isDuplicate) {
        entry.isDuplicate = true;
        entry.duplicateOfTempId = winner._tempId;
      }
    }
  };

  byEmail.forEach(applyCluster);
  byDomainName.forEach(applyCluster);

  return Array.from(resultMap.values());
}
