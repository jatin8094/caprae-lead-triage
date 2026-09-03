"use client";

import { useCallback, useEffect, useState } from "react";
import UploadPanel from "@/components/UploadPanel";
import StatsBar from "@/components/StatsBar";
import FilterBar from "@/components/FilterBar";
import LeadTable, { LeadRow } from "@/components/LeadTable";

interface Stats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
}

export default function Home() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, hot: 0, warm: 0, cold: 0 });
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [isFetching, setIsFetching] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    setIsFetching(true);
    const params = new URLSearchParams();
    if (activeTier) params.set("tier", activeTier);
    if (search) params.set("q", search);
    params.set("hideDuplicates", String(hideDuplicates));

    const res = await fetch(`/api/leads?${params.toString()}`);
    const data = await res.json();
    setLeads(data.leads);
    setStats(data.stats);
    setIsFetching(false);
    setHasLoadedOnce(true);
  }, [activeTier, search, hideDuplicates]);

  useEffect(() => {
    load();
  }, [load]);

  function handleExport() {
    const params = new URLSearchParams();
    if (activeTier) params.set("tier", activeTier);
    params.set("hideDuplicates", String(hideDuplicates));
    window.open(`/api/leads/export?${params.toString()}`, "_blank");
  }

  async function handleReset() {
    if (!confirm("Clear every imported lead? This can't be undone.")) return;
    await fetch("/api/leads", { method: "DELETE" });
    setActiveTier(null);
    setSearch("");
    load();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 overflow-hidden rounded-lg bg-ink px-6 py-7 sm:px-8">
  <div className="flex flex-wrap items-start justify-between gap-6">
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">
          Scoring layer
        </span>
      </div>
      <h1 className="text-2xl font-semibold text-white">Lead triage</h1>
      <p className="mt-1 max-w-xl text-sm text-white/60">
        Import a CSV, and every row gets ranked by fit, checked for duplicates, and filled
        in where data is missing — so a rep opens a ranked call list instead of a
        spreadsheet.
      </p>
    </div>

    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <span className={`h-2 w-2 rounded-full ${stats.total > 0 ? "bg-accent animate-pulse" : "bg-white/20"}`} />
      <span className="font-mono text-lg tabular-nums text-white">{stats.total}</span>
      <span className="text-xs text-white/50">leads scored</span>
    </div>
  </div>
</header>

      <div className="mb-8">
        <UploadPanel onImported={load} />
      </div>

      <div className="mb-4">
        <StatsBar stats={stats} activeTier={activeTier} onTierClick={setActiveTier} />
      </div>

      <div className="mb-4">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          hideDuplicates={hideDuplicates}
          onHideDuplicatesChange={setHideDuplicates}
          onExport={handleExport}
          onReset={handleReset}
          resultCount={leads.length}
        />
      </div>

      {!hasLoadedOnce ? (
        <div className="rounded-lg border border-line bg-white p-10 text-center text-sm text-ink/40">
          Loading…
        </div>
      ) : (
        <div
          className={`min-h-[120px] transition-opacity duration-150 ${
            isFetching ? "opacity-50" : "opacity-100"
          }`}
        >
          <LeadTable leads={leads} />
        </div>
      )}
    </main>
  );
}