"use client";

import { useRef, useState } from "react";

interface ImportSummary {
  imported: number;
  duplicatesFlagged: number;
  hot: number;
  warm: number;
  cold: number;
  unmappedColumns?: string[];
  rowsMissingCore?: number;
}

interface Props {
  onImported: (summary: ImportSummary) => void;
}

export default function UploadPanel({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setWarning(null);
    setIsUploading(true);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/leads/import", { method: "POST", body: form });
      const data: ImportSummary & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");

      if (data.unmappedColumns && data.unmappedColumns.length > 0) {
        setWarning(
          `Imported ${data.imported} rows, but couldn't recognize these columns: ${data.unmappedColumns.join(
            ", "
          )}. Those fields were skipped — rename the header and re-upload to include them.`
        );
      } else if (data.rowsMissingCore && data.rowsMissingCore > 0) {
        setWarning(
          `${data.rowsMissingCore} of ${data.imported} rows are missing a name or company — check that your CSV has those columns filled in.`
        );
      }

      onImported(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading that file.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className={`rounded border border-dashed p-6 text-sm transition-colors ${
        isDragging ? "border-accent bg-accentSoft" : "border-line bg-white"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <p className="font-medium text-ink">Import a lead export</p>
      <p className="mt-1 text-ink/60">
        Drop a CSV from SaaSquatch or any similar scraper. Rows are enriched, scored against your
        ICP, deduplicated and saved — nothing leaves this list unranked.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="focus-ring rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
        >
          {isUploading ? "Scoring…" : "Choose CSV"}
        </button>
        {fileName && <span className="text-ink/50">{fileName}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="mt-3 text-sm text-hot">{error}</p>}
      {warning && !error && <p className="mt-3 text-sm text-warn">{warning}</p>}
    </div>
  );
}