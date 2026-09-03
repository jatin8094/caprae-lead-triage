interface Props {
  stats: { total: number; hot: number; warm: number; cold: number };
  activeTier: string | null;
  onTierClick: (tier: string | null) => void;
}

const TIERS: { key: "hot" | "warm" | "cold"; label: string; dot: string; activeBg: string; activeText: string }[] = [
  { key: "hot", label: "Call today", dot: "bg-hot", activeBg: "bg-hot", activeText: "text-white" },
  { key: "warm", label: "Worth a look", dot: "bg-warn", activeBg: "bg-warn", activeText: "text-white" },
  { key: "cold", label: "Low priority", dot: "bg-cold", activeBg: "bg-cold", activeText: "text-white" },
];

export default function StatsBar({ stats, activeTier, onTierClick }: Props) {
  const isAllActive = activeTier === null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        onClick={() => onTierClick(null)}
        className={[
          "focus-ring rounded-lg border px-4 py-3 text-left transition-all duration-150",
          isAllActive
            ? "border-ink bg-ink text-white shadow-sm"
            : "border-line bg-white text-ink hover:border-ink/30 hover:shadow-sm",
        ].join(" ")}
      >
        <div className="font-mono text-2xl tabular-nums">{stats.total}</div>
        <div className={isAllActive ? "text-xs text-white/70" : "text-xs text-ink/50"}>All leads</div>
      </button>

      {TIERS.map((t) => {
        const isActive = activeTier === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onTierClick(t.key)}
            className={[
              "focus-ring rounded-lg border px-4 py-3 text-left transition-all duration-150",
              isActive
                ? `border-transparent ${t.activeBg} ${t.activeText} shadow-sm`
                : "border-line bg-white text-ink hover:border-ink/30 hover:shadow-sm",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              {!isActive && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
              <span className="font-mono text-2xl tabular-nums">{stats[t.key]}</span>
            </div>
            <div className={isActive ? "text-xs text-white/70" : "text-xs text-ink/50"}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}