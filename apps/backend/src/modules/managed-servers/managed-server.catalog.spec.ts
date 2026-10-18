import { buildFeatureInstallScript, resolveManagedServerFeatures } from "./managed-server.catalog";

describe("managed server catalog", () => {
  it("combines package features with supported individual selections", () => {
    expect(resolveManagedServerFeatures("CONTAINER", ["NODEJS", "UNKNOWN"])).toEqual([
      "GIT",
      "DOCKER",
      "UFW",
      "FAIL2BAN",
      "NODEJS",
    ]);
  });

  it("builds only predefined scripts", () => {
    expect(buildFeatureInstallScript("DOCKER")).toContain("docker");
    expect(buildFeatureInstallScript("PLESK")).toContain("autoinstall.plesk.com");
  });
});
