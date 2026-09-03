"use client";

import { useState } from "react";

export interface LeadRow {
  id: string;
  fullName: string;
  title: string | null;
  company: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  email: string | null;
  linkedinUrl: string | null;
  score: number;
  tier: string;
  scoreBreakdown: string;
}

const TIER_STYLE: Record<string, string> = {
  hot: "bg-hotSoft text-hot",
  warm: "bg-warnSoft text-warn",
  cold: "bg-coldSoft text-cold",
};

const TIER_BAR: Record<string, string> = {
  hot: "bg-hot",
  warm: "bg-warn",
  cold: "bg-cold",
};

function ScoreBar({ score, tier }: { score: number; tier: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-300 ${TIER_BAR[tier] ?? "bg-ink"}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-ink/70">{score}</span>
    </div>
  );
}

function BreakdownStat({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-ink/40">{label}</span>
      <span className="font-mono text-sm text-ink">
        {value}
        <span className="text-ink/30">/{max}</span>
      </span>
    </div>
  );
}

export default function LeadTable({ leads }: { leads: LeadRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-10 text-center text-sm text-ink/50">
        No leads match this view yet. Import a CSV or clear your filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-xs text-ink/50">
              <th className="px-4 py-2.5 font-medium">Lead</th>
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Industry</th>
              <th className="px-4 py-2.5 font-medium">Size</th>
              <th className="px-4 py-2.5 font-medium">Fit score</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const isExpanded = expandedId === lead.id;
              const breakdown = JSON.parse(lead.scoreBreakdown || "{}");
              return (
                <>
                  <tr
                    key={lead.id}
                    onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                    className={`group cursor-pointer border-b border-line transition-colors last:border-0 ${
                      isExpanded ? "bg-paper" : "hover:bg-paper/70"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{lead.fullName}</div>
                      <div className="text-xs text-ink/50">{lead.title ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{lead.company}</div>
                      <div className="text-xs text-ink/50">{lead.domain ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{lead.industry ?? "—"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-ink/70">
                      {lead.employeeCount ? lead.employeeCount.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={lead.score} tier={lead.tier} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TIER_STYLE[lead.tier]}`}>
                        {lead.tier}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-line bg-paper last:border-0">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="flex flex-wrap items-start gap-8">
                          <BreakdownStat label="Title fit" value={breakdown.titleFit ?? 0} max={35} />
                          <BreakdownStat label="Industry fit" value={breakdown.industryFit ?? 0} max={25} />
                          <BreakdownStat label="Size fit" value={breakdown.sizeFit ?? 0} max={20} />
                          <BreakdownStat label="Data quality" value={breakdown.dataQuality ?? 0} max={20} />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase tracking-wide text-ink/40">Contact</span>
                            <span className="text-sm text-ink">{lead.email ?? "—"}</span>
                          </div>
                          {lead.linkedinUrl && (
                            <a
                              href={lead.linkedinUrl.startsWith("http") ? lead.linkedinUrl : `https://${lead.linkedinUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-4 text-sm text-accent underline underline-offset-2 hover:text-accent/80"
                            >
                              View LinkedIn →
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}