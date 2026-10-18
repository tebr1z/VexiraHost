import { ApacheProxyService } from "./remote-deploy.service";
import type { SshSession } from "./ssh.service";

function setup(liveReadinessFails = false) {
  const exec = jest.fn(async (command: string) => {
    if (command.includes("docker ps -a") && command.includes("vx-app-rollback")) {
      return { code: 0, stdout: "", stderr: "" };
    }
    if (command.includes("docker ps -a") && command.includes("vx-app")) {
      return { code: 0, stdout: "vx-app\n", stderr: "" };
    }
    if (command.includes("while [") && command.includes("vx-app-candidate")) {
      return { code: 0, stdout: "Ready: HTTP 200 on /health\n", stderr: "" };
    }
    if (command.includes("while [") && liveReadinessFails) {
      return { code: 1, stdout: "Readiness check timed out\n", stderr: "" };
    }
    if (command.includes("while [")) {
      return { code: 0, stdout: "Ready: HTTP 200 on /health\n", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  });
  const execChecked = jest.fn(async (command: string) => {
    if (command.includes("docker port")) return "127.0.0.1:43123\n";
    return "";
  });
  const session = { exec, execChecked } as unknown as SshSession;
  const service = new ApacheProxyService({} as never, {} as never);
  const switchTraffic = jest.fn(async (_port: number) => undefined);
  const append = jest.fn(async () => undefined);

  return { service, session, exec, execChecked, switchTraffic, append };
}

const input = {
  containerName: "vx-app",
  image: "vx-app:latest",
  accountId: "account-1",
  envFile: "/srv/vx-app/.env",
  hostPort: 43001,
  containerPort: 3000,
} as const;

describe("Docker blue-green activation", () => {
  it("keeps traffic on a healthy candidate while replacing the live container", async () => {
    const context = setup();

    await context.service.activateRelease({
      ...input,
      session: context.session,
      append: context.append,
      switchTraffic: context.switchTraffic,
    });

    expect(context.switchTraffic.mock.calls.map(([port]) => port)).toEqual([43123, 43001]);
    expect(context.execChecked).toHaveBeenCalledWith(
      expect.stringContaining("docker stop 'vx-app'"),
      120_000,
    );
  });

  it("restores the previous container and proxy target when live readiness fails", async () => {
    const context = setup(true);

    await expect(
      context.service.activateRelease({
        ...input,
        session: context.session,
        append: context.append,
        switchTraffic: context.switchTraffic,
      }),
    ).rejects.toThrow("previous release restored");

    expect(context.switchTraffic.mock.calls.map(([port]) => port)).toEqual([43123, 43001]);
    expect(context.execChecked).toHaveBeenCalledWith(
      expect.stringContaining("docker rename 'vx-app-rollback' 'vx-app'"),
      60_000,
    );
    expect(context.append).toHaveBeenCalledWith(
      "rollback",
      "New release failed readiness; previous container was restored automatically.",
    );
  });
});
