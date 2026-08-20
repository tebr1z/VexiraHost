import { Injectable } from "@nestjs/common";

const MAX_FAILED_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000;
const EMAIL_CAPTCHA_AFTER = 1;
const IP_CAPTCHA_AFTER = 3;

interface AttemptState {
  count: number;
  alertSent: boolean;
  windowStartedAt: number;
}

@Injectable()
export class LoginAttemptService {
  private readonly byEmail = new Map<string, AttemptState>();
  private readonly byIp = new Map<string, AttemptState>();

  isLocked(email: string): boolean {
    return this.getCount(this.byEmail, email.toLowerCase()) >= MAX_FAILED_ATTEMPTS;
  }

  requiresCaptcha(email: string, ip?: string): boolean {
    if (this.getCount(this.byEmail, email.toLowerCase()) >= EMAIL_CAPTCHA_AFTER) {
      return true;
    }
    if (ip?.trim() && this.getCount(this.byIp, ip.trim()) >= IP_CAPTCHA_AFTER) {
      return true;
    }
    return false;
  }

  recordFailure(email: string, ip?: string): boolean {
    if (ip?.trim()) {
      this.bump(this.byIp, ip.trim());
    }
    return this.bump(this.byEmail, email.toLowerCase());
  }

  clear(email: string): void {
    this.byEmail.delete(email.toLowerCase());
  }

  private getCount(store: Map<string, AttemptState>, key: string): number {
    const current = store.get(key);
    if (!current) return 0;
    if (Date.now() - current.windowStartedAt > ATTEMPT_WINDOW_MS) {
      store.delete(key);
      return 0;
    }
    return current.count;
  }

  private bump(store: Map<string, AttemptState>, key: string): boolean {
    const now = Date.now();
    const current = store.get(key);

    if (!current || now - current.windowStartedAt > ATTEMPT_WINDOW_MS) {
      store.set(key, { count: 1, alertSent: false, windowStartedAt: now });
      return false;
    }

    current.count += 1;
    if (current.count >= MAX_FAILED_ATTEMPTS && !current.alertSent) {
      current.alertSent = true;
      store.set(key, current);
      return true;
    }

    store.set(key, current);
    return false;
  }
}
