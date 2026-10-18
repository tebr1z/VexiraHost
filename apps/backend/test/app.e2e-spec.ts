import { VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { HealthController } from "../src/common/health/health.controller";
import { AdminSystemService } from "../src/modules/admin/service/admin-system.service";

describe("Health API", () => {
  it("serves the versioned public health contract through Nest HTTP", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: AdminSystemService,
          useValue: {
            getPublicSystemStatus: jest.fn().mockResolvedValue({ maintenance: false }),
          },
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        status: "ok",
        service: "vexira-host-api",
        maintenance: false,
      });
    } finally {
      await app.close();
    }
  });
});
