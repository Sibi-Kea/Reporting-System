import { createHmac } from "crypto";

function getLookupSecret() {
  return process.env.STAFF_CODE_LOOKUP_SECRET ?? process.env.NEXTAUTH_SECRET ?? "worktrack-pro-staff-code";
}

export function normalizeStaffCode(value: string) {
  return value.trim();
}

export function hashStaffCodeLookup(value: string) {
  return createHmac("sha256", getLookupSecret()).update(normalizeStaffCode(value)).digest("hex");
}
