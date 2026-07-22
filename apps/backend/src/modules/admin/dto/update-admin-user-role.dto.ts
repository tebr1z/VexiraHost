import { IsIn } from "class-validator";

export class UpdateAdminUserRoleDto {
  @IsIn(["admin", "staff", "customer"])
  role!: "admin" | "staff" | "customer";
}
