import Papa from "papaparse";
import { RawLeadRow } from "@/types/lead";

const FIELD_SYNONYMS: Record<keyof RawLeadRow, string[]> = {
  fullName: ["fullname", "full name", "name", "contact name", "contact", "employee name", "lead name", "person"],
  title: ["title", "job title", "position", "role", "job role", "designation"],
  company: ["company", "companyname", "company name", "organization", "org", "employer", "business"],
  domain: ["domain", "website", "company domain", "site", "url", "web"],
  industry: ["industry", "sector", "vertical", "category"],
  employeeCount: ["employeecount", "employees", "company size", "employee count", "headcount", "team size", "size"],
  email: ["email", "email address", "work email", "e-mail", "contact email"],
  linkedinUrl: ["linkedinurl", "linkedin", "linkedin url", "linkedin profile", "li url"],
  location: ["location", "city", "hq", "region", "country", "address"],
  name: [],
  companyName: [],
  website: [],
  employees: [],
  linkedin: [],
};

const FIELD_KEYS = Object.keys(FIELD_SYNONYMS) as (keyof RawLeadRow)[];

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[\s_\-./]+/g, "").trim();
}

export interface ParsedLeadCsv {
  rows: RawLeadRow[];
  unmappedColumns: string[];
  mappedColumns: Record<string, string>;
}

export function parseLeadCsvDetailed(csvText: string): ParsedLeadCsv {
  const { data } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (data.length === 0) {
    return { rows: [], unmappedColumns: [], mappedColumns: {} };
  }

  const headers = Object.keys(data[0]);
  const headerToField = new Map<string, keyof RawLeadRow>();
  const unmapped: string[] = [];

  for (const header of headers) {
    const normalizedHeader = normalizeKey(header);
    let matchedField: keyof RawLeadRow | null = null;

    for (const field of FIELD_KEYS) {
      const synonyms = FIELD_SYNONYMS[field];
      if (synonyms.some((syn) => normalizeKey(syn) === normalizedHeader)) {
        matchedField = field;
        break;
      }
    }

    if (!matchedField) {
      for (const field of FIELD_KEYS) {
        const synonyms = FIELD_SYNONYMS[field];
        if (
          synonyms.some((syn) => {
            const normSyn = normalizeKey(syn);
            return normSyn.length > 2 && (normalizedHeader.includes(normSyn) || normSyn.includes(normalizedHeader));
          })
        ) {
          matchedField = field;
          break;
        }
      }
    }

    if (matchedField) {
      headerToField.set(header, matchedField);
    } else {
      unmapped.push(header);
    }
  }

  const mappedColumns: Record<string, string> = {};
  headerToField.forEach((field, header) => (mappedColumns[header] = field));

  const rows: RawLeadRow[] = data.map((row) => {
    const normalized: RawLeadRow = {};
    headerToField.forEach((field, header) => {
      const value = row[header]?.trim();
      if (value) (normalized as Record<string, string>)[field] = value;
    });
    return normalized;
  });

  return { rows, unmappedColumns: unmapped, mappedColumns };
}

export function parseLeadCsv(csvText: string): RawLeadRow[] {
  return parseLeadCsvDetailed(csvText).rows;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}