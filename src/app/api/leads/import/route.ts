import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLeadCsv } from "@/lib/csv";
import { scoreLead, parseEmployeeCount } from "@/lib/scoring";
import { dedupeLeads, DedupeInput } from "@/lib/dedupe";
import { enrichRow } from "@/lib/enrichment";
import { DEFAULT_ICP, ICPConfig } from "@/types/lead";

export const runtime = "nodejs";

/**
 * POST /api/leads/import
 * Body: multipart/form-data with a `file` field (CSV export from SaaSquatch
 * or similar), optional `icp` JSON field to override default targeting.
 *
 * Pipeline: parse -> enrich blanks -> score against ICP -> dedupe -> persist.
 * Runs enrichment concurrently (bounded) since it's the only I/O-bound step.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const icpRaw = form.get("icp");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing CSV file under field 'file'." }, { status: 400 });
  }

  const icp: ICPConfig = icpRaw ? { ...DEFAULT_ICP, ...JSON.parse(icpRaw as string) } : DEFAULT_ICP;

  const text = await file.text();
  const rawRows = parseLeadCsv(text);

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "No parseable rows in that CSV." }, { status: 400 });
  }

  // Bounded concurrency enrichment (chunks of 25) to avoid hammering a real
  // provider's rate limit once this is swapped from the heuristic stub.
  const enriched = [];
  const CHUNK = 25;
  for (let i = 0; i < rawRows.length; i += CHUNK) {
    const chunk = rawRows.slice(i, i + CHUNK);
    enriched.push(...(await Promise.all(chunk.map(enrichRow))));
  }

  const scored = enriched.map((row) => ({ row, ...scoreLead(row, icp) }));

  const dedupeInput: DedupeInput[] = scored.map((s, idx) => ({
    ...s.row,
    _tempId: String(idx),
    _score: s.score,
  }));
  const dedupeResults = dedupeLeads(dedupeInput);
  const dedupeByTempId = new Map(dedupeResults.map((d) => [d._tempId, d]));

  const created = await prisma.$transaction(
    scored.map((s, idx) => {
      const dedupe = dedupeByTempId.get(String(idx))!;
      return prisma.lead.create({
        data: {
          fullName: s.row.fullName ?? s.row.name ?? "Unknown",
          title: s.row.title ?? null,
          company: s.row.company ?? s.row.companyName ?? "Unknown",
          domain: s.row.domain ?? s.row.website ?? null,
          industry: s.row.industry ?? null,
          employeeCount: parseEmployeeCount(s.row.employeeCount ?? s.row.employees),
          email: s.row.email ?? null,
          linkedinUrl: s.row.linkedinUrl ?? s.row.linkedin ?? null,
          location: s.row.location ?? null,
          score: s.score,
          tier: s.tier,
          scoreBreakdown: JSON.stringify(s.breakdown),
          isDuplicate: dedupe.isDuplicate,
          enrichedAt: new Date(),
        },
      });
    })
  );

  const duplicateCount = dedupeResults.filter((d) => d.isDuplicate).length;

  return NextResponse.json({
    imported: created.length,
    duplicatesFlagged: duplicateCount,
    hot: scored.filter((s) => s.tier === "hot").length,
    warm: scored.filter((s) => s.tier === "warm").length,
    cold: scored.filter((s) => s.tier === "cold").length,
  });
}
