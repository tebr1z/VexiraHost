import { BadRequestException } from "@nestjs/common";

/** Accept a docker pull ref or a Docker Hub / registry URL and return a pullable image. */
export function parseDockerImageInput(raw: string | null | undefined): string {
  let value = (raw ?? "").trim();
  if (!value) return "";
  value = value.replace(/^docker\s+pull\s+/i, "").trim();

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, "");
      const parts = url.pathname.split("/").filter(Boolean);
      const tag = url.searchParams.get("tag") || url.searchParams.get("name");

      if (host === "hub.docker.com") {
        let image = "";
        if (parts[0] === "_" && parts[1]) image = parts[1];
        else if (parts[0] === "r" && parts[1] && parts[2]) image = `${parts[1]}/${parts[2]}`;
        else if (parts[0] === "repository" && parts[1] === "docker" && parts[2] && parts[3]) {
          image = `${parts[2]}/${parts[3]}`;
        }
        if (image && tag && !image.includes(":")) return `${image}:${tag}`;
        return image;
      }

      if (host.includes(".") && parts.length >= 1) {
        const path = parts.join("/").replace(/\/+$/, "");
        const image = `${host}/${path}`;
        if (tag && !image.includes(":")) return `${image}:${tag}`;
        return image;
      }
    } catch {
      return value;
    }
  }

  return value.replace(/^docker\.io\//i, "");
}

/** Reject shell metacharacters so the ref is safe in remote SSH commands. */
export function sanitizeDockerImageRef(raw: string | null | undefined): string {
  const value = parseDockerImageInput(raw);
  if (value.length < 2 || value.length > 255) {
    throw new BadRequestException("Docker image must be 2–255 characters");
  }
  if (/[;|&$`'"\\\s]/.test(value) || value.includes("..")) {
    throw new BadRequestException("Docker image contains invalid characters");
  }
  const ok =
    /^(?:[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]+)?\/)?(?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/)*[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[a-zA-Z0-9._-]{1,128})?$/i.test(
      value,
    );
  if (!ok) {
    throw new BadRequestException(
      "Docker image must look like nginx:alpine or ghcr.io/org/app:1.0",
    );
  }
  return value;
}

export function dockerRegistryHost(imageRef: string): string {
  const withoutTag = imageRef.replace(/:[^:/]+$/, "");
  const first = withoutTag.split("/")[0] ?? "";
  if (first.includes(".") || first.includes(":") || first === "localhost") {
    return first;
  }
  return "docker.io";
}

export const DOCKER_REGISTRY_ENV_KEYS = [
  "DOCKER_REGISTRY_USER",
  "DOCKER_REGISTRY_PASSWORD",
  "DOCKER_REGISTRY",
] as const;

export function splitRegistryAuth(env: Record<string, string>): {
  appEnv: Record<string, string>;
  registryUser: string | null;
  registryPassword: string | null;
  registryHost: string | null;
} {
  const appEnv = { ...env };
  const registryUser = appEnv.DOCKER_REGISTRY_USER?.trim() || null;
  const registryPassword = appEnv.DOCKER_REGISTRY_PASSWORD ?? null;
  const registryHost = appEnv.DOCKER_REGISTRY?.trim() || null;
  for (const key of DOCKER_REGISTRY_ENV_KEYS) {
    delete appEnv[key];
  }
  return { appEnv, registryUser, registryPassword, registryHost };
}
