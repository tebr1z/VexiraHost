import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

import { Public } from "@/decorators/auth.decorators";

import { GeoService } from "../service/geo.service";

@Controller("geo")
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get("currency")
  detectCurrency(@Req() req: Request) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
      req.ip ??
      null;
    return this.geoService.detectCurrency(ip);
  }
}
