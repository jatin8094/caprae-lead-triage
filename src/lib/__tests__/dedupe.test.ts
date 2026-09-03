import { describe, it, expect } from "vitest";
import { dedupeLeads, DedupeInput } from "../dedupe";

function lead(overrides: Partial<DedupeInput>): DedupeInput {
  return {
    _tempId: "0",
    _score: 50,
    ...overrides,
  };
}

describe("dedupeLeads", () => {
  it("flags two rows with the same email as duplicates, keeping the higher-scoring one", () => {
    const rows = [
      lead({ _tempId: "a", _score: 80, email: "maria@brightloop.io" }),
      lead({ _tempId: "b", _score: 40, email: "maria@brightloop.io" }),
    ];
    const results = dedupeLeads(rows);
    const a = results.find((r) => r._tempId === "a")!;
    const b = results.find((r) => r._tempId === "b")!;

    expect(a.isDuplicate).toBe(false);
    expect(b.isDuplicate).toBe(true);
    expect(b.duplicateOfTempId).toBe("a");
  });

  it("matches on domain + normalized name when emails differ", () => {
    const rows = [
      lead({ _tempId: "a", _score: 90, fullName: "Maria Chen", domain: "brightloop.io", email: "maria@brightloop.io" }),
      lead({ _tempId: "b", _score: 60, fullName: "Maria Chen", domain: "brightloop.io", email: "mchen@brightloop.io" }),
    ];
    const results = dedupeLeads(rows);
    expect(results.find((r) => r._tempId === "b")!.isDuplicate).toBe(true);
  });

  it("does not flag two different people at the same company", () => {
    const rows = [
      lead({ _tempId: "a", _score: 90, fullName: "Maria Chen", domain: "brightloop.io" }),
      lead({ _tempId: "b", _score: 60, fullName: "Tom Whitfield", domain: "brightloop.io" }),
    ];
    const results = dedupeLeads(rows);
    expect(results.every((r) => !r.isDuplicate)).toBe(true);
  });

  it("normalizes domain casing, protocol, and www prefix before comparing", () => {
    const rows = [
      lead({ _tempId: "a", _score: 90, fullName: "Maria Chen", domain: "https://www.Brightloop.io/about" }),
      lead({ _tempId: "b", _score: 60, fullName: "maria chen", domain: "brightloop.io" }),
    ];
    const results = dedupeLeads(rows);
    expect(results.find((r) => r._tempId === "b")!.isDuplicate).toBe(true);
  });

  it("leaves a unique row untouched", () => {
    const rows = [lead({ _tempId: "a", email: "unique@company.com" })];
    const results = dedupeLeads(rows);
    expect(results[0].isDuplicate).toBe(false);
    expect(results[0].duplicateOfTempId).toBeNull();
  });

  it("clusters three copies of the same lead down to one winner", () => {
    const rows = [
      lead({ _tempId: "a", _score: 70, email: "x@y.com" }),
      lead({ _tempId: "b", _score: 95, email: "x@y.com" }),
      lead({ _tempId: "c", _score: 50, email: "x@y.com" }),
    ];
    const results = dedupeLeads(rows);
    const survivors = results.filter((r) => !r.isDuplicate);
    expect(survivors).toHaveLength(1);
    expect(survivors[0]._tempId).toBe("b");
  });
});