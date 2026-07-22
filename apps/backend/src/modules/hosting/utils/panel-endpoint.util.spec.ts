import {
  buildPleskSessionLoginUrl,
  normalizePanelHostname,
  normalizePanelHostnameForStorage,
  resolvePanelEndpoint,
} from "../utils/panel-endpoint.util";

describe("panel-endpoint.util", () => {
  it("parses Plesk server with public login URL and IP:port", () => {
    const endpoint = resolvePanelEndpoint({
      hostname: "https://panel1.vexirahost.com/login_up.php",
      ipAddress: "45.59.70.162:8443",
      panel: "PLESK",
    });

    expect(endpoint.connectHost).toBe("45.59.70.162");
    expect(endpoint.connectPort).toBe(8443);
    expect(endpoint.apiOrigin).toBe("https://45.59.70.162:8443");
    expect(endpoint.panelOrigin).toBe("https://panel1.vexirahost.com:8443");
    expect(endpoint.sessionOrigin).toBe("https://panel1.vexirahost.com:8443");
    expect(endpoint.customLoginPath).toBe("/login_up.php");
  });

  it("builds official rsession_init login URL on port 8443", () => {
    const endpoint = resolvePanelEndpoint({
      hostname: "https://panel1.vexirahost.com",
      ipAddress: "45.59.70.162:8443",
      panel: "PLESK",
    });

    const url = buildPleskSessionLoginUrl(endpoint, "abc123");
    expect(url).toBe(
      "https://panel1.vexirahost.com:8443/enterprise/rsession_init.php?PHPSESSID=abc123&PLESKSESSID=abc123&success_redirect_url=%2Fsmb%2Fweb%2Fview",
    );
    expect(url).not.toContain("login_up.php");
  });

  it("respects explicit :8443 in hostname", () => {
    const endpoint = resolvePanelEndpoint({
      hostname: "https://panel1.vexirahost.com:8443",
      ipAddress: "45.59.70.162:8443",
      panel: "PLESK",
    });

    expect(endpoint.sessionOrigin).toBe("https://panel1.vexirahost.com:8443");
  });

  it("falls back to IP for session when no hostname", () => {
    const endpoint = resolvePanelEndpoint({
      hostname: "",
      ipAddress: "45.59.70.162:8443",
      panel: "PLESK",
    });

    expect(endpoint.sessionOrigin).toBe("https://45.59.70.162:8443");
    expect(buildPleskSessionLoginUrl(endpoint, "tok")).toContain("45.59.70.162:8443/enterprise/rsession_init.php");
  });

  it("normalizes panel hostname URLs without breaking path", () => {
    expect(normalizePanelHostname("https://Panel1.VexiraHost.com/login_up.php")).toBe(
      "https://panel1.vexirahost.com/login_up.php",
    );
  });

  it("stores Plesk hostname with default port 8443", () => {
    expect(normalizePanelHostnameForStorage("https://panel1.vexirahost.com/login_up.php", "PLESK")).toBe(
      "https://panel1.vexirahost.com:8443",
    );
  });
});
