import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";
import type { AuthUser } from "@vexira/types";

import {
  InitiateTransferDto,
  RegisterDomainDto,
  SearchDomainsQueryDto,
  TransferDomainDto,
  UpdateDnsRecordsDto,
} from "../dto";
import { DomainsService } from "../service/domains.service";

@Controller("domains")
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Public()
  @Get("search")
  search(@Query() query: SearchDomainsQueryDto) {
    return this.domainsService.search(query.q);
  }

  @Get()
  list(@User() user: AuthUser) {
    return this.domainsService.listForUser(user.id);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.domainsService.getForUser(id, user.id);
  }

  @Post("register")
  register(@Body() dto: RegisterDomainDto, @User() user: AuthUser) {
    return this.domainsService.register(dto.name, user.id);
  }

  @Post("transfer")
  initiateTransfer(@Body() dto: InitiateTransferDto, @User() user: AuthUser) {
    return this.domainsService.initiateTransfer(dto.domainName, dto.authCode, user.id);
  }

  @Post(":id/transfer")
  retryTransfer(
    @Param("id") id: string,
    @Body() dto: TransferDomainDto,
    @User() user: AuthUser,
  ) {
    return this.domainsService.retryTransfer(id, dto.authCode, user.id);
  }

  @Get(":id/dns")
  getDns(@Param("id") id: string, @User() user: AuthUser) {
    return this.domainsService.getDnsRecords(id, user.id);
  }

  @Put(":id/dns")
  updateDns(
    @Param("id") id: string,
    @Body() dto: UpdateDnsRecordsDto,
    @User() user: AuthUser,
  ) {
    return this.domainsService.updateDnsRecords(id, user.id, dto);
  }
}
