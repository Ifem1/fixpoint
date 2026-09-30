import { describe, expect, it } from "vitest";
import { isFullSha, isSafeId, parseInvariants, parseLines } from "../../lib/validation";

describe("form validation", () => {
  it("requires full commit SHAs", () => {
    expect(isFullSha("a".repeat(40))).toBe(true);
    expect(isFullSha("abc123")).toBe(false);
  });

  it("rejects unsafe ids", () => {
    expect(isSafeId("fix-v1")).toBe(true);
    expect(isSafeId("fix v1")).toBe(false);
  });

  it("parses frozen invariant rows", () => {
    expect(parseInvariants("INV-1: reads survive\nINV-2: writes stay guarded")).toEqual([
      { id: "INV-1", text: "reads survive" },
      { id: "INV-2", text: "writes stay guarded" },
    ]);
  });

  it("deduplicates bounded supporting URLs", () => {
    expect(parseLines("a\na\nb\nc", 2)).toEqual(["a", "b"]);
  });
});
