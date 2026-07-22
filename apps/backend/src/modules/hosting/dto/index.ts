import { HostingPanel } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class ListHostingPlansQueryDto {
  @IsOptional()
  @IsEnum(HostingPanel)
  panel?: HostingPanel;
}

export class ProvisionHostingDto {
  @IsString()
  planSlug!: string;

  @IsString()
  @MinLength(4)
  @Matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i, {
    message: "Invalid primary domain",
  })
  primaryDomain!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z][a-z0-9]{2,15}$/, {
    message: "Username must start with a letter and contain 3-16 alphanumeric characters",
  })
  username?: string;
}

export { CreateHostingServerDto, UpdateHostingServerDto } from "./hosting-server.dto";
export { PanelLoginDto } from "./panel-login.dto";
