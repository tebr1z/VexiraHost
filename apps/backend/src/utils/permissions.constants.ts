import { UserRole } from "@vexira/types";

/**
 * RBAC permission definitions — architecture scaffold.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.STAFF]: 50,
  [UserRole.CUSTOMER]: 10,
};

export const PERMISSIONS = {
  USERS: {
    READ: "users:read",
    CREATE: "users:create",
    UPDATE: "users:update",
    DELETE: "users:delete",
  },
  ORDERS: {
    READ: "orders:read",
    CREATE: "orders:create",
    MANAGE: "orders:manage",
  },
  ADMIN: {
    ACCESS: "admin:access",
    AUDIT: "admin:audit",
  },
} as const;
