import {
  buildContainerReadinessCommand,
  buildManagedContainerRunCommand,
  parseDockerPublishedPort,
} from "./container-rollout.util";

describe("container rollout commands", () => {
  it("starts a candidate on a random loopback port with bounded logs", () => {
    const command = buildManagedContainerRunCommand({
      name: "vx-app-candidate",
      image: "vx-app:latest",
      accountId: "account-1",
      envFile: "/srv/app/.env",
      containerPort: 3000,
      candidate: true,
    });

    expect(command).toContain("--restart no");
    expect(command).toContain("--log-opt max-size=10m");
    expect(command).toContain("--log-opt max-file=3");
    expect(command).toContain("--cap-drop ALL");
    expect(command).toContain("--security-opt no-new-privileges:true");
    expect(command).toContain("com.vexira.account=account-1");
    expect(command).toContain("-p 127.0.0.1::3000");
    expect(command).toContain("-e PORT=3000");
  });

  it("can expose only a managed port for a separate reverse-proxy server", () => {
    const command = buildManagedContainerRunCommand({
      name: "vx-remote-app",
      image: "vx-remote-app:latest",
      accountId: "account-2",
      envFile: "/srv/app/.env",
      containerPort: 8080,
      hostPort: 43002,
      bindHost: "0.0.0.0",
    });

    expect(command).toContain("-p 0.0.0.0:43002:8080");
    expect(command).toContain("--pids-limit 256");
  });

  it("binds a candidate to the deploy node interface used by a remote proxy", () => {
    const command = buildManagedContainerRunCommand({
      name: "vx-remote-candidate",
      image: "vx-remote:latest",
      accountId: "account-2",
      envFile: "/srv/app/.env",
      containerPort: 8080,
      bindHost: "0.0.0.0",
      candidate: true,
    });

    expect(command).toContain("-p 0.0.0.0::8080");
  });

  it("starts the live container on its managed host port", () => {
    const command = buildManagedContainerRunCommand({
      name: "vx-app",
      image: "vx-app:latest",
      accountId: "account-1",
      envFile: "/srv/app/.env",
      containerPort: 3000,
      hostPort: 43001,
    });

    expect(command).toContain("--restart unless-stopped");
    expect(command).toContain("-p 127.0.0.1:43001:3000");
  });

  it("probes common Next and Nest health paths", () => {
    const command = buildContainerReadinessCommand({
      name: "vx-app",
      containerPort: 3000,
      attempts: 20,
    });

    expect(command).toContain("docker port 'vx-app' 3000/tcp");
    expect(command).toContain("/api/v1/health");
    expect(command).toContain("HTTP $code");
    expect(command).toContain('while [ "$attempt" -le 20 ]');
  });

  it.each(["127.0.0.1:43123", "0.0.0.0:43123", ":::43123"])(
    "parses Docker published candidate port from %s",
    (value) => {
      expect(parseDockerPublishedPort(value)).toBe(43123);
    },
  );

  it("rejects an invalid Docker published port", () => {
    expect(() => parseDockerPublishedPort("missing")).toThrow(
      "Docker did not report a valid candidate port",
    );
  });
});
