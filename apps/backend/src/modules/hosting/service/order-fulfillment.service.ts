import { Injectable, Logger } from "@nestjs/common";
import { ProductCategory } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import { LicensesService } from "@/modules/licenses/service/licenses.service";

import { HostingService } from "./hosting.service";

interface OrderItemMetadata {
  primaryDomain?: string;
  planSlug?: string;
}

const ADDON_CATEGORIES = new Set<ProductCategory>([
  ProductCategory.LICENSE,
  ProductCategory.SSL,
  ProductCategory.EMAIL,
  ProductCategory.BACKUP,
]);

@Injectable()
export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hostingService: HostingService,
    private readonly licensesService: LicensesService,
  ) {}

  async fulfillOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) return;

    const paidInvoice = await this.prisma.invoice.findFirst({
      where: { orderId, status: "PAID" },
    });
    if (!paidInvoice) {
      this.logger.warn(`Refusing to fulfill unpaid order ${orderId}`);
      return;
    }

    for (const item of order.items) {
      if (item.product.category === ProductCategory.HOSTING) {
        await this.fulfillHostingItem(orderId, order.userId, item);
        continue;
      }

      if (ADDON_CATEGORIES.has(item.product.category)) {
        await this.fulfillAddonItem(order, item);
      }
    }
  }

  private async fulfillHostingItem(
    orderId: string,
    userId: string,
    item: {
      id: string;
      metadata: unknown;
      product: { hostingPlanSlug: string | null };
    },
  ): Promise<void> {
    const metadata = (item.metadata ?? {}) as OrderItemMetadata;
    const planSlug = metadata.planSlug ?? item.product.hostingPlanSlug;
    const primaryDomain = metadata.primaryDomain;

    if (!planSlug || !primaryDomain) {
      this.logger.warn(
        `Skipping hosting fulfillment for order ${orderId} item ${item.id}: missing planSlug or primaryDomain`,
      );
      return;
    }

    try {
      await this.hostingService.provision(userId, { planSlug, primaryDomain }, { orderId });
    } catch (error) {
      this.logger.error(
        `Hosting fulfillment failed for order ${orderId}, item ${item.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  private async fulfillAddonItem(
    order: {
      id: string;
      userId: string;
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
        preferredCurrency: string | null;
      };
    },
    item: {
      id: string;
      metadata: unknown;
      product: {
        category: ProductCategory;
        name: string;
        slug: string;
      };
    },
  ): Promise<void> {
    const metadata = (item.metadata ?? {}) as OrderItemMetadata;

    try {
      await this.licensesService.provisionFromOrder({
        userId: order.userId,
        userEmail: order.user.email,
        firstName: order.user.firstName,
        lastName: order.user.lastName,
        preferredCurrency: order.user.preferredCurrency,
        productCategory: item.product.category,
        productName: item.product.name,
        productSlug: item.product.slug,
        orderId: order.id,
        identifier: metadata.primaryDomain,
      });
    } catch (error) {
      this.logger.error(
        `Addon fulfillment failed for order ${order.id}, item ${item.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }
}
