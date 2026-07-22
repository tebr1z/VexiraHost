const STORAGE_KEY = "vexira-last-google-account";

export type LastGoogleAccount = {
  email: string;
  name?: string;
};

export function saveLastGoogleAccount(account: LastGoogleAccount): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

export function getLastGoogleAccount(): LastGoogleAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastGoogleAccount;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastGoogleAccount(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
