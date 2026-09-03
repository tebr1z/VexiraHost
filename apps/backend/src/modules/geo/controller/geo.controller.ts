import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

import { GeoService } from "../service/geo.service";

import { Public } from "@/decorators/auth.decorators";

@Controller("geo")
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get("currency")
  detectCurrency(@Req() req: Request) {
    const forwarded = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
      (typeof realIp === "string" ? realIp.trim() : undefined) ??
      req.ip ??
      null;

    const cfCountry = req.headers["cf-ipcountry"];
    const headerCountry = typeof cfCountry === "string" ? cfCountry : null;

    return this.geoService.detectCurrency(ip, headerCountry);
  }
}
