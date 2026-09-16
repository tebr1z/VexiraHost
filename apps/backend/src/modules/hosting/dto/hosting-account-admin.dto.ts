import { ArrayNotEmpty, IsArray, IsIn, IsString } from "class-validator";

export class UpdateHostingAccountStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}

export class ResolveHostingCancelRequestDto {
  @IsIn(["deactivate", "delete", "reject"])
  action!: "deactivate" | "delete" | "reject";
}

export class MigrateHostingAccountsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  accountIds!: string[];

  @IsString()
  targetServerId!: string;
}
