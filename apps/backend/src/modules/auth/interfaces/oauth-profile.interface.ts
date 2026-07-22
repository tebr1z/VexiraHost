export interface OAuthProfile {
  provider: "GOOGLE" | "GITHUB";
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
}
