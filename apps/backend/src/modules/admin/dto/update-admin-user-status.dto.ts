import { IsIn } from "class-validator";

export class UpdateAdminUserStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}
