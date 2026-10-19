const STORAGE_KEY = "vexira-last-google-account";

export type LastGoogleAccount = {
  email: string;
  name?: string;
  avatarUrl?: string;
};

function safeGoogleAvatar(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "lh3.googleusercontent.com") {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function saveLastGoogleAccount(account: LastGoogleAccount): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...account, avatarUrl: safeGoogleAvatar(account.avatarUrl) }),
  );
}

export function getLastGoogleAccount(): LastGoogleAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastGoogleAccount;
    if (!parsed?.email) return null;
    return { ...parsed, avatarUrl: safeGoogleAvatar(parsed.avatarUrl) };
  } catch {
    return null;
  }
}

export function clearLastGoogleAccount(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
