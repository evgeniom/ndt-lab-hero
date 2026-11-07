import { z } from "zod";

export const registrationSchema = z.object({
  orgName: z.string().trim().min(2).max(160),
  labName: z.string().trim().min(2).max(160),
  accreditationNumber: z.string().trim().min(1).max(160),
  kind: z.enum(["independent", "subordinate"]),
  parentOrg: z.string().trim().max(160),
  headName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(200),
  login: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
  password: z.string().min(8).max(72),
});

export function approvedLabRecord(request: {
  org_name: string; lab_name: string; accreditation_number: string;
  kind: string; parent_org: string; head_name: string;
}) {
  return {
    org_name: request.org_name, lab_name: request.lab_name,
    accreditation_number: request.accreditation_number,
    kind: request.kind, parent_org: request.parent_org, head_name: request.head_name,
  };
}