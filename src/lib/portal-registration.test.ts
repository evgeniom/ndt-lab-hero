import { describe, expect, it } from "vitest";
import { approvedLabRecord, registrationSchema } from "./portal-registration";

const registration = {
  orgName: "Test organization", labName: "Test NDT laboratory",
  accreditationNumber: "TEST-ACC-017", kind: "independent", parentOrg: "",
  headName: "Test Lab Head", email: "test@example.com", login: "test_lab_head",
  password: "Test-Only-Password-2026",
};

describe("laboratory accreditation", () => {
  it("requires a nonblank accreditation number at registration", () => {
    expect(registrationSchema.safeParse(registration).success).toBe(true);
    expect(registrationSchema.safeParse({ ...registration, accreditationNumber: "   " }).success).toBe(false);
    const { accreditationNumber: _number, ...missing } = registration;
    expect(registrationSchema.safeParse(missing).success).toBe(false);
  });
  it("preserves the lab name and accreditation number on approval", () => {
    const lab = approvedLabRecord({ org_name: "Test organization", lab_name: "Test NDT laboratory", accreditation_number: "TEST-ACC-017", kind: "independent", parent_org: "", head_name: "Test Lab Head" });
    expect(lab.lab_name).toBe("Test NDT laboratory");
    expect(lab.accreditation_number).toBe("TEST-ACC-017");
  });
});