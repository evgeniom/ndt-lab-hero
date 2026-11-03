import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/roles", () => ({ useAccess: () => ({}) }));
import { pickInitial } from "./lab-data";

describe("per-lab data", () => {
  it("a newly approved lab starts with no demo records", () => {
    expect(pickInitial(undefined, false, ["demo"], [])).toEqual([]);
  });
  it("the demo lab shows sample records", () => {
    expect(pickInitial(undefined, true, ["demo"], [])).toEqual(["demo"]);
  });
  it("saved lab records win over samples", () => {
    expect(pickInitial(["mine"], true, ["demo"], [])).toEqual(["mine"]);
  });
});
