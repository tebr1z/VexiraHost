export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "staff";
}
