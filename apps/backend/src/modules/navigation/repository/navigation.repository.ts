import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class NavigationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveGroups() {
    return this.prisma.navGroup.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { href: "asc" }],
        },
      },
    });
  }

  findAllGroups() {
    return this.prisma.navGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { href: "asc" }],
        },
      },
    });
  }

  findGroupById(id: string) {
    return this.prisma.navGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { href: "asc" }],
        },
      },
    });
  }

  findGroupByKey(key: string) {
    return this.prisma.navGroup.findUnique({ where: { key } });
  }

  createGroup(data: Prisma.NavGroupCreateInput) {
    return this.prisma.navGroup.create({
      data,
      include: { items: true },
    });
  }

  updateGroup(id: string, data: Prisma.NavGroupUpdateInput) {
    return this.prisma.navGroup.update({
      where: { id },
      data,
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { href: "asc" }],
        },
      },
    });
  }

  deleteGroup(id: string) {
    return this.prisma.navGroup.delete({ where: { id } });
  }

  findItemById(id: string) {
    return this.prisma.navItem.findUnique({ where: { id } });
  }

  createItem(data: Prisma.NavItemCreateInput) {
    return this.prisma.navItem.create({ data });
  }

  updateItem(id: string, data: Prisma.NavItemUpdateInput) {
    return this.prisma.navItem.update({ where: { id }, data });
  }

  deleteItem(id: string) {
    return this.prisma.navItem.delete({ where: { id } });
  }
}
