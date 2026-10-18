import { BadRequestException, NotFoundException } from "@nestjs/common";

import { NavigationRepository } from "../repository/navigation.repository";

import { AdminNavigationService } from "./admin-navigation.service";
import { NavigationService } from "./navigation.service";

describe("AdminNavigationService reorder", () => {
  const repository = {
    findAllGroups: jest.fn(),
    findGroupById: jest.fn(),
    reorderGroups: jest.fn(),
    reorderItems: jest.fn(),
  };
  const navigationService = {
    listAdmin: jest.fn(),
    getAdminGroup: jest.fn(),
  };
  let service: AdminNavigationService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AdminNavigationService(
      repository as unknown as NavigationRepository,
      navigationService as unknown as NavigationService,
    );
  });

  it("stores the complete category order and returns the refreshed list", async () => {
    repository.findAllGroups.mockResolvedValue([{ id: "products" }, { id: "services" }]);
    navigationService.listAdmin.mockResolvedValue([{ id: "services" }, { id: "products" }]);

    await expect(service.reorderGroups(["services", "products"])).resolves.toEqual([
      { id: "services" },
      { id: "products" },
    ]);
    expect(repository.reorderGroups).toHaveBeenCalledWith(["services", "products"]);
  });

  it("rejects an incomplete or duplicated category order", async () => {
    repository.findAllGroups.mockResolvedValue([{ id: "products" }, { id: "services" }]);

    await expect(service.reorderGroups(["products", "products"])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.reorderGroups).not.toHaveBeenCalled();
  });

  it("stores the complete sub-link order inside its category", async () => {
    repository.findGroupById.mockResolvedValue({
      id: "products",
      items: [{ id: "hosting" }, { id: "vps" }],
    });
    navigationService.getAdminGroup.mockResolvedValue({
      id: "products",
      items: [{ id: "vps" }, { id: "hosting" }],
    });

    await service.reorderItems("products", ["vps", "hosting"]);
    expect(repository.reorderItems).toHaveBeenCalledWith(["vps", "hosting"]);
    expect(navigationService.getAdminGroup).toHaveBeenCalledWith("products");
  });

  it("rejects sub-links that do not belong to the selected category", async () => {
    repository.findGroupById.mockResolvedValue({ id: "products", items: [{ id: "hosting" }] });

    await expect(service.reorderItems("products", ["other"])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.reorderItems).not.toHaveBeenCalled();
  });

  it("rejects reordering an unknown category", async () => {
    repository.findGroupById.mockResolvedValue(null);

    await expect(service.reorderItems("missing", [])).rejects.toBeInstanceOf(NotFoundException);
  });
});
