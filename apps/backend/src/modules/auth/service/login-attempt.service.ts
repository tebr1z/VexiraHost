import { Injectable } from "@nestjs/common";

const MAX_FAILED_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000;

interface AttemptState {
  count: number;
  alertSent: boolean;
  windowStartedAt: number;
}

@Injectable()
export class LoginAttemptService {
  private readonly attempts = new Map<string, AttemptState>();

  recordFailure(email: string): boolean {
    const key = email.toLowerCase();
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || now - current.windowStartedAt > ATTEMPT_WINDOW_MS) {
      const next: AttemptState = { count: 1, alertSent: false, windowStartedAt: now };
      this.attempts.set(key, next);
      return false;
    }

    current.count += 1;

    if (current.count >= MAX_FAILED_ATTEMPTS && !current.alertSent) {
      current.alertSent = true;
      this.attempts.set(key, current);
      return true;
    }

    this.attempts.set(key, current);
    return false;
  }

  clear(email: string): void {
    this.attempts.delete(email.toLowerCase());
  }
}
