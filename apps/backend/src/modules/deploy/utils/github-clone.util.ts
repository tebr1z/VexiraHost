/** Build HTTPS clone URL with GitHub token for private repositories. */
export function buildGitHubAuthenticatedCloneUrl(repoUrl: string, accessToken: string): string {
  const trimmed = repoUrl.trim();
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://x-access-token:${encodeURIComponent(accessToken)}@github.com/${sshMatch[1]}/${sshMatch[2]}.git`;
  }

  try {
    const url = new URL(trimmed.replace(/\.git$/, ""));
    if (!url.hostname.includes("github.com")) {
      return trimmed;
    }
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    if (parts.length < 2) return trimmed;
    const [owner, repo] = parts;
    return `https://x-access-token:${encodeURIComponent(accessToken)}@github.com/${owner}/${repo.replace(/\.git$/, "")}.git`;
  } catch {
    return trimmed;
  }
}

export function isGitHubRepoUrl(repoUrl: string): boolean {
  return /github\.com/i.test(repoUrl);
}

export function normalizeGitHubRepoUrl(fullName: string): string {
  const cleaned = fullName
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  return `https://github.com/${cleaned}.git`;
}
