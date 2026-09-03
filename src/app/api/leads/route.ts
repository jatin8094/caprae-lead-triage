import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  const industry = searchParams.get("industry");
  const hideDuplicates = searchParams.get("hideDuplicates") !== "false";
  const q = searchParams.get("q");

  const leads = await prisma.lead.findMany({
    where: {
      ...(tier ? { tier } : {}),
      ...(industry ? { industry: { contains: industry } } : {}),
      ...(hideDuplicates ? { isDuplicate: false } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { company: { contains: q } },
              { title: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { score: "desc" },
  });

  const stats = {
    total: leads.length,
    hot: leads.filter((l) => l.tier === "hot").length,
    warm: leads.filter((l) => l.tier === "warm").length,
    cold: leads.filter((l) => l.tier === "cold").length,
  };

  return NextResponse.json({ leads, stats });
}

export async function DELETE() {
  await prisma.lead.deleteMany({});
  return NextResponse.json({ ok: true });
}