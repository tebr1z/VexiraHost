export interface OAuthProfile {
  provider: "GOOGLE" | "GITHUB";
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
}
