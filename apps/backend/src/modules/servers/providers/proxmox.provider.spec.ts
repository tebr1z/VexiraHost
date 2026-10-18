import { ConfigService } from "@nestjs/config";
import { ServerStatus, ServerType } from "@prisma/client";

import { RealProxmoxProvider } from "./proxmox.provider";

function response<T>(data: T): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ data }),
  } as unknown as Response;
}

function provider() {
  const values: Record<string, unknown> = {
    "proxmox.apiUrl": "https://pve.example.com:8006",
    "proxmox.tokenId": "root@pam!vexira",
    "proxmox.tokenSecret": "secret",
    "proxmox.defaultNode": "pve-1",
    "proxmox.defaultTemplateVmId": "9000",
    "proxmox.storage": "local-lvm",
    "proxmox.disk": "scsi0",
    "proxmox.regionNodes": { "fra-01": "pve-1" },
    "proxmox.templates": { "ubuntu-22.04": "9000" },
  };
  return new RealProxmoxProvider({
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService);
}

describe("RealProxmoxProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("clones, sizes and starts a VM through the Proxmox API", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response(1200))
      .mockResolvedValueOnce(response("UPID:clone"))
      .mockResolvedValueOnce(response({ status: "stopped", exitstatus: "OK" }))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response("UPID:start"))
      .mockResolvedValueOnce(response({ status: "stopped", exitstatus: "OK" }))
      .mockResolvedValueOnce(
        response({
          result: [
            {
              "ip-addresses": [
                { "ip-address": "127.0.0.1", "ip-address-type": "ipv4" },
                { "ip-address": "203.0.113.10", "ip-address-type": "ipv4" },
              ],
            },
          ],
        }),
      );

    await expect(
      provider().provision({
        hostname: "demo-1",
        cpuCores: 2,
        ramGb: 4,
        diskGb: 80,
        region: "fra-01",
        osTemplate: "ubuntu-22.04",
        type: ServerType.VPS,
      }),
    ).resolves.toEqual({
      vmId: "1200",
      node: "pve-1",
      ipv4: "203.0.113.10",
      status: ServerStatus.RUNNING,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/qemu/9000/clone"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "PVEAPIToken=root@pam!vexira=secret",
        }),
      }),
    );
  });

  it("maps live Proxmox metrics", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response({ cpu: 0.25, mem: 2 * 1024 ** 3, maxmem: 4 * 1024 ** 3 }))
      .mockResolvedValueOnce(response([{ cpu: 0.1 }, { cpu: 0.25, diskread: 1024 ** 2 }]));

    await expect(provider().getMetrics("1200", "pve-1", 4)).resolves.toEqual(
      expect.objectContaining({ cpuPercent: 25, ramUsedGb: 2, ramTotalGb: 4 }),
    );
  });
});
