import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductCategory } from "@prisma/client";

import { Public } from "@/decorators/auth.decorators";

import { CatalogService } from "../service/catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get("categories")
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Public()
  @Get("products")
  listProducts(
    @Query("category") category?: ProductCategory,
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
