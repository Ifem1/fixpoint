import { describe, expect, it } from "vitest";
import { phaseFromSnapshot } from "../../lib/lifecycle";

describe("transaction lifecycle", () => {
  it("does not treat accepted as final", () => {
    expect(phaseFromSnapshot({ statusName: "ACCEPTED", executionName: "FINISHED_WITH_RETURN" })).toBe("accepted");
  });

  it("recognizes finalized successful execution", () => {
    expect(phaseFromSnapshot({ statusName: "FINALIZED", executionName: "FINISHED_WITH_RETURN" })).toBe("finalized");
  });

  it("does not hide a failed execution behind finalization", () => {
    expect(phaseFromSnapshot({ statusName: "FINALIZED", executionName: "ERROR" })).toBe("failed");
  });

  it("keeps undecided transactions submitted", () => {
    expect(phaseFromSnapshot({ statusName: "COMMITTING" })).toBe("submitted");
  });
});
