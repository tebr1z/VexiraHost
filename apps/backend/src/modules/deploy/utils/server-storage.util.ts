export type ServerDiskMount = {
  mount: string;
  sizeBytes: number;
  usedBytes: number;
  availBytes: number;
  usePercent: number;
};

export type ServerContainerImage = {
  name: string;
  id: string;
  size: string;
};

export type ServerStorageProbe = {
  disks: ServerDiskMount[];
  images: ServerContainerImage[];
  dockerSystemDf: string | null;
  probedAt: string;
};

/** Probe disk + container image usage (docker/podman CLI). */
export const STORAGE_PROBE_COMMAND = [
  `df -PB1 / /var /var/tmp /var/lib/containers /home 2>/dev/null | awk 'NR>1 {print "DISK",$6,$2,$3,$4,$5}'`,
  `docker images --format 'IMAGE {{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}' 2>/dev/null | head -n 80`,
  `echo DOCKER_DF_BEGIN`,
  `docker system df 2>/dev/null || true`,
  `echo DOCKER_DF_END`,
].join("; ");

export function parseStorageProbeOutput(output: string): Omit<ServerStorageProbe, "probedAt"> {
  const disks: ServerDiskMount[] = [];
  const images: ServerContainerImage[] = [];
  const seenMounts = new Set<string>();

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("DISK ")) {
      const parts = trimmed.split(/\s+/);
      // DISK mount size used avail use%
      if (parts.length < 6) continue;
      const mount = parts[1]!;
      if (seenMounts.has(mount)) continue;
      seenMounts.add(mount);
      const sizeBytes = Number(parts[2]);
      const usedBytes = Number(parts[3]);
      const availBytes = Number(parts[4]);
      const usePercent = Number(String(parts[5]).replace(/%/g, ""));
      if (![sizeBytes, usedBytes, availBytes, usePercent].every((n) => Number.isFinite(n)))
        continue;
      disks.push({ mount, sizeBytes, usedBytes, availBytes, usePercent });
      continue;
    }

    if (trimmed.startsWith("IMAGE ")) {
      // IMAGE repo:tag id size — size may be "1.2GB" without space
      const rest = trimmed.slice("IMAGE ".length).trim();
      const match = rest.match(/^(.+?)\s+([a-f0-9]+)\s+(.+)$/i);
      if (!match) continue;
      images.push({
        name: match[1] || "<none>",
        id: match[2] || "",
        size: match[3] || "",
      });
    }
  }

  const dfMatch = output.match(/DOCKER_DF_BEGIN\s*([\s\S]*?)\s*DOCKER_DF_END/);
  const dockerSystemDf = dfMatch?.[1]?.trim() || null;

  return { disks, images, dockerSystemDf };
}

export function formatBytesAsGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
