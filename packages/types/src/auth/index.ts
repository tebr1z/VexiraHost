/**
 * User roles for RBAC.
 */
export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CUSTOMER = "customer",
}

/**
 * Permission action types.
 */
export enum PermissionAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  MANAGE = "manage",
}

/**
 * JWT token payload structure.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user context.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  emailVerified: boolean;
  status: string;
  preferredCurrency?: string | null;
  billingPeriod?: string | null;
  currencyLocked?: boolean;
  currencyChangedAt?: string | null;
  canChangeCurrency?: boolean;
  nextCurrencyChangeAt?: string | null;
  billingAddress?: {
    fullName: string;
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  } | null;
}

export interface AuthSession {
  user: AuthUserProfile;
  tokens: AuthTokens;
}
