import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type {
  CreateNavGroupDto,
  CreateNavItemDto,
  NavLabelsDto,
  UpdateNavGroupDto,
  UpdateNavItemDto,
} from "../dto/navigation.dto";
import { NavigationRepository } from "../repository/navigation.repository";
import { NavigationService } from "./navigation.service";

function toJsonLabels(labels: NavLabelsDto): Prisma.InputJsonValue {
  return labels as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class AdminNavigationService {
  constructor(
    private readonly repository: NavigationRepository,
    private readonly navigationService: NavigationService,
  ) {}

  listGroups() {
    return this.navigationService.listAdmin();
  }

  async createGroup(dto: CreateNavGroupDto) {
    const existing = await this.repository.findGroupByKey(dto.key);
    if (existing) {
      throw new ConflictException(`Navigation group key "${dto.key}" already exists`);
    }

    const group = await this.repository.createGroup({
      key: dto.key,
      labels: toJsonLabels(dto.labels),
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.navigationService.getAdminGroup(group.id);
  }

  async updateGroup(id: string, dto: UpdateNavGroupDto) {
    const group = await this.repository.findGroupById(id);
    if (!group) {
      throw new NotFoundException("Navigation group not found");
    }

    if (dto.key && dto.key !== group.key) {
      const existing = await this.repository.findGroupByKey(dto.key);
      if (existing) {
        throw new ConflictException(`Navigation group key "${dto.key}" already exists`);
      }
    }

    await this.repository.updateGroup(id, {
      key: dto.key,
      labels: dto.labels ? toJsonLabels(dto.labels) : undefined,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });

    return this.navigationService.getAdminGroup(id);
  }

  async deleteGroup(id: string) {
    const group = await this.repository.findGroupById(id);
    if (!group) {
      throw new NotFoundException("Navigation group not found");
    }

    await this.repository.deleteGroup(id);
    return { success: true };
  }

  async createItem(groupId: string, dto: CreateNavItemDto) {
    const group = await this.repository.findGroupById(groupId);
    if (!group) {
      throw new NotFoundException("Navigation group not found");
    }

    const item = await this.repository.createItem({
      group: { connect: { id: groupId } },
      labels: toJsonLabels(dto.labels),
      href: dto.href,
      pathMatch: dto.pathMatch,
      sortOrder: dto.sortOrder ?? group.items.length,
      isActive: dto.isActive ?? true,
    });

    return item;
  }

  async updateItem(id: string, dto: UpdateNavItemDto) {
    const item = await this.repository.findItemById(id);
    if (!item) {
      throw new NotFoundException("Navigation item not found");
    }

    return this.repository.updateItem(id, {
      labels: dto.labels ? toJsonLabels(dto.labels) : undefined,
      href: dto.href,
      pathMatch: dto.pathMatch === undefined ? undefined : dto.pathMatch,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
  }

  async deleteItem(id: string) {
    const item = await this.repository.findItemById(id);
    if (!item) {
      throw new NotFoundException("Navigation item not found");
    }

    await this.repository.deleteItem(id);
    return { success: true };
  }
}
