import { Controller, Get, Param, Query } from "@nestjs/common";

import { CatalogService } from "../service/catalog.service";

import { Public } from "@/decorators/auth.decorators";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get("categories")
  listCategories(@Query("locale") locale?: string) {
    return this.catalogService.listCategories(locale);
  }

  @Public()
  @Get("products")
  listProducts(
    @Query("category") category?: string,
    @Query("currency") currency?: string,
    @Query("period") period?: string,
  ) {
    return this.catalogService.listProducts(category, currency, period);
  }

  @Public()
  @Get("products/:slug")
  getProduct(
    @Param("slug") slug: string,
    @Query("currency") currency?: string,
    @Query("period") period?: string,
  ) {
    return this.catalogService.getProduct(slug, currency, period);
  }
}
