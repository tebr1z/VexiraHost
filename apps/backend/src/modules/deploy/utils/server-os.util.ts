export type OsFamily = "debian" | "rhel";

export type DetectedOs = {
  id: string;
  versionId: string;
  prettyName: string;
  family: OsFamily | null;
};

const RHEL_IDS = new Set(["almalinux", "rocky", "centos", "rhel", "fedora", "ol"]);
const DEBIAN_IDS = new Set(["ubuntu", "debian", "linuxmint", "pop"]);

export function resolveOsFamily(id: string): OsFamily | null {
  const normalized = id.trim().toLowerCase();
  if (DEBIAN_IDS.has(normalized)) return "debian";
  if (RHEL_IDS.has(normalized)) return "rhel";
  return null;
}

export function inferOsFamilyFromLabel(label: string | null | undefined): OsFamily | null {
  if (!label?.trim()) return null;
  const lower = label.toLowerCase();
  if (lower.includes("ubuntu") || lower.includes("debian")) return "debian";
  if (
    lower.includes("alma") ||
    lower.includes("centos") ||
    lower.includes("rocky") ||
    lower.includes("rhel") ||
    lower.includes("red hat")
  ) {
    return "rhel";
  }
  return null;
}

/** Parse `VX_OS_*` lines emitted by the remote detect script. */
export function parseDetectedOsOutput(output: string): DetectedOs | null {
  const lines = output.split("\n");
  let id = "";
  let versionId = "";
  let prettyName = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("VX_OS_ID=")) id = trimmed.slice("VX_OS_ID=".length).trim();
    if (trimmed.startsWith("VX_OS_VERSION="))
      versionId = trimmed.slice("VX_OS_VERSION=".length).trim();
    if (trimmed.startsWith("VX_OS_PRETTY="))
      prettyName = trimmed.slice("VX_OS_PRETTY=".length).trim();
  }

  if (!id) return null;

  return {
    id,
    versionId,
    prettyName: prettyName || `${id} ${versionId}`.trim(),
    family: resolveOsFamily(id),
  };
}

export function formatOsVersionLabel(detected: DetectedOs): string {
  return detected.prettyName || `${detected.id} ${detected.versionId}`.trim();
}
