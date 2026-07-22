import { UserRole } from "@vexira/types";
import { UserRole as PrismaUserRole } from "@prisma/client";

export function mapPrismaRoleToApp(role: string): UserRole {
  switch (role) {
    case "ADMIN":
      return UserRole.ADMIN;
    case "STAFF":
      return UserRole.STAFF;
    default:
      return UserRole.CUSTOMER;
  }
}

export function mapAppRoleToPrisma(role: string): PrismaUserRole {
  switch (role) {
    case "admin":
      return PrismaUserRole.ADMIN;
    case "staff":
      return PrismaUserRole.STAFF;
    default:
      return PrismaUserRole.CUSTOMER;
  }
}
