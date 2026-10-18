import { DeployStack } from "@prisma/client";

import { resolveDeployRuntime } from "./deploy-runtime.util";

describe("resolveDeployRuntime", () => {
  it.each([DeployStack.NEXTJS, DeployStack.NESTJS])("uses PM2 for %s source deploys", (stack) => {
    expect(resolveDeployRuntime(stack, "GIT")).toBe("pm2");
    expect(resolveDeployRuntime(stack, "UPLOAD")).toBe("pm2");
  });

  it("uses Docker for .NET image deploys", () => {
    expect(resolveDeployRuntime("DOTNET", "DOCKER_IMAGE")).toBe("docker");
  });

  it("keeps legacy Docker deployments on Docker", () => {
    expect(resolveDeployRuntime("DOCKER", "GIT")).toBe("docker");
  });
});
