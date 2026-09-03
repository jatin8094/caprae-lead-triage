import { describe, it, expect } from "vitest";
import { scoreLead, parseEmployeeCount } from "../scoring";
import { DEFAULT_ICP } from "@/types/lead";
import { RawLeadRow } from "@/types/lead";

describe("parseEmployeeCount", () => {
  it("parses a plain number", () => {
    expect(parseEmployeeCount("150")).toBe(150);
  });

  it("parses a range as its midpoint", () => {
    expect(parseEmployeeCount("50-100")).toBe(75);
  });

  it("parses a '+' suffix as its lower bound", () => {
    expect(parseEmployeeCount("500+")).toBe(500);
  });

  it("returns null for empty/undefined input", () => {
    expect(parseEmployeeCount(undefined)).toBeNull();
    expect(parseEmployeeCount("")).toBeNull();
  });

  it("passes numeric input through unchanged", () => {
    expect(parseEmployeeCount(42)).toBe(42);
  });
});

describe("scoreLead", () => {
  const strongFit: RawLeadRow = {
    fullName: "Maria Chen",
    title: "Founder & CEO",
    company: "Brightloop",
    domain: "brightloop.io",
    industry: "SaaS",
    employeeCount: "45",
    email: "maria@brightloop.io",
    linkedinUrl: "linkedin.com/in/mariachen",
  };

  it("scores an in-ICP decision-maker as hot", () => {
    const result = scoreLead(strongFit, DEFAULT_ICP);
    expect(result.tier).toBe("hot");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.titleFit).toBe(35);
    expect(result.breakdown.industryFit).toBe(25);
  });

  it("scores an out-of-ICP company size lower than an in-ICP one, all else equal", () => {
    const tooLarge: RawLeadRow = { ...strongFit, employeeCount: "5000" };
    const inBand = scoreLead(strongFit, DEFAULT_ICP);
    const outOfBand = scoreLead(tooLarge, DEFAULT_ICP);
    expect(outOfBand.score).toBeLessThan(inBand.score);
  });

  it("gives partial credit to adjacent seniority titles, not zero", () => {
    // "Director of Sales" is an exact DEFAULT_ICP match — use a title that's
    // senior but not in the target list to test the partial-credit path.
    const directorRow: RawLeadRow = { ...strongFit, title: "Director of Marketing" };
    const result = scoreLead(directorRow, DEFAULT_ICP);
    expect(result.breakdown.titleFit).toBeGreaterThan(0);
    expect(result.breakdown.titleFit).toBeLessThan(35);
  });

  it("scores a low-seniority, off-ICP-size, sparse-data row as cold", () => {
    const weakFit: RawLeadRow = {
      fullName: "Random Intern",
      title: "Intern",
      company: "BigCorp",
      employeeCount: "10000",
    };
    const result = scoreLead(weakFit, DEFAULT_ICP);
    expect(result.tier).toBe("cold");
  });

  it("scores missing employee count with partial (not zero) size-fit credit", () => {
    const noSize: RawLeadRow = { ...strongFit, employeeCount: undefined };
    const result = scoreLead(noSize, DEFAULT_ICP);
    expect(result.breakdown.sizeFit).toBeGreaterThan(0);
  });

  it("rewards more complete contact data with a higher data-quality score", () => {
    const sparse: RawLeadRow = { fullName: "Jane Doe", company: "Acme" };
    const complete: RawLeadRow = { ...sparse, email: "jane@acme.com", linkedinUrl: "linkedin.com/in/jane", title: "CEO", domain: "acme.com" };
    const sparseResult = scoreLead(sparse, DEFAULT_ICP);
    const completeResult = scoreLead(complete, DEFAULT_ICP);
    expect(completeResult.breakdown.dataQuality).toBeGreaterThan(sparseResult.breakdown.dataQuality);
  });
});