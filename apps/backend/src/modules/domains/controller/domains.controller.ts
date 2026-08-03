import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import type { AuthUser } from "@vexira/types";

import {
  InitiateTransferDto,
  RegisterDomainDto,
  SearchDomainsQueryDto,
  TransferDomainDto,
  UpdateDnsRecordsDto,
  UpdateNameserversDto,
  UpdateNsGlueDto,
} from "../dto";
import { DomainsService } from "../service/domains.service";

import { Public } from "@/decorators/auth.decorators";
import { User } from "@/decorators/user.decorator";

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
  retryTransfer(@Param("id") id: string, @Body() dto: TransferDomainDto, @User() user: AuthUser) {
    return this.domainsService.retryTransfer(id, dto.authCode, user.id);
  }

  @Get(":id/dns")
  getDns(@Param("id") id: string, @User() user: AuthUser) {
    return this.domainsService.getDnsRecords(id, user.id);
  }

  @Put(":id/dns")
  updateDns(@Param("id") id: string, @Body() dto: UpdateDnsRecordsDto, @User() user: AuthUser) {
    return this.domainsService.updateDnsRecords(id, user.id, dto);
  }

  @Put(":id/nameservers")
  updateNameservers(
    @Param("id") id: string,
    @Body() dto: UpdateNameserversDto,
    @User() user: AuthUser,
  ) {
    return this.domainsService.updateNameservers(id, user.id, dto);
  }

  @Put(":id/ns-glue")
  updateNsGlue(@Param("id") id: string, @Body() dto: UpdateNsGlueDto, @User() user: AuthUser) {
    return this.domainsService.updateNsGlue(id, user.id, dto);
  }
}
