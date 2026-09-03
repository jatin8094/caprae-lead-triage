"use client";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  hideDuplicates: boolean;
  onHideDuplicatesChange: (v: boolean) => void;
  onExport: () => void;
  onReset: () => void;
  resultCount: number;
}

export default function FilterBar({
  search,
  onSearchChange,
  hideDuplicates,
  onHideDuplicatesChange,
  onExport,
  onReset,
  resultCount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, company, or title"
          className="focus-ring w-64 rounded border border-line bg-white px-3 py-1.5 text-sm placeholder:text-ink/40"
        />
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={hideDuplicates}
            onChange={(e) => onHideDuplicatesChange(e.target.checked)}
            className="focus-ring rounded border-line accent-ink"
          />
          Hide duplicates
        </label>
        <span className="text-xs text-ink/40">{resultCount} shown</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="focus-ring rounded border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
        >
          Export CSV
        </button>
        <button
          onClick={onReset}
          className="focus-ring rounded px-3 py-1.5 text-sm text-ink/40 hover:text-ink"
        >
          Reset demo
        </button>
      </div>
    </div>
  );
}
