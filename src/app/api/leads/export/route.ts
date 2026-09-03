import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

/**
 * GET /api/leads/export?tier=hot
 * Streams the currently-filtered, deduped, scored leads back out as CSV —
 * the "integrate into existing sales workflow" requirement: drop straight
 * into a sequencer or CRM import.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  const hideDuplicates = searchParams.get("hideDuplicates") !== "false";

  const leads = await prisma.lead.findMany({
    where: {
      ...(tier ? { tier } : {}),
      ...(hideDuplicates ? { isDuplicate: false } : {}),
    },
    orderBy: { score: "desc" },
  });

  const csv = toCsv(
    leads.map((l) => ({
      name: l.fullName,
      title: l.title ?? "",
      company: l.company,
      domain: l.domain ?? "",
      industry: l.industry ?? "",
      employees: l.employeeCount ?? "",
      email: l.email ?? "",
      linkedin: l.linkedinUrl ?? "",
      location: l.location ?? "",
      score: l.score,
      tier: l.tier,
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="scored-leads-${tier ?? "all"}.csv"`,
    },
  });
}
