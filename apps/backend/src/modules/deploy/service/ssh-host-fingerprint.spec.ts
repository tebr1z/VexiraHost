import { matchesSshHostFingerprint } from "./ssh.service";

describe("SSH host fingerprint pinning", () => {
  it("matches normalized SHA-256 fingerprints", () => {
    expect(matchesSshHostFingerprint("SHA256:ABC123", "abc123")).toBe(true);
  });

  it("rejects changed host keys", () => {
    expect(matchesSshHostFingerprint("SHA256:server-a", "SHA256:server-b")).toBe(false);
  });
});
