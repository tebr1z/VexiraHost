import { z } from "zod";

export type AuthValidationMessages = {
  emailRequired: string;
  passwordMin: string;
  firstNameRequired: string;
  lastNameRequired: string;
  confirmPasswordRequired: string;
  passwordsMismatch: string;
  acceptTermsRequired: string;
};

export function createLoginSchema(messages: Pick<AuthValidationMessages, "emailRequired" | "passwordMin">) {
  return z.object({
    email: z.string().email(messages.emailRequired),
    password: z.string().min(8, messages.passwordMin),
    rememberMe: z.boolean().default(false),
  });
}

export function createRegisterSchema(messages: AuthValidationMessages) {
  return z
    .object({
      firstName: z.string().min(1, messages.firstNameRequired).optional(),
      lastName: z.string().min(1, messages.lastNameRequired).optional(),
      email: z.string().email(messages.emailRequired),
      password: z.string().min(8, messages.passwordMin),
      confirmPassword: z.string().min(8, messages.confirmPasswordRequired),
      preferredCurrency: z.enum(["USD", "EUR", "AZN"]).default("USD"),
      acceptedTerms: z.boolean().default(false),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsMismatch,
      path: ["confirmPassword"],
    })
    .refine((data) => data.acceptedTerms, {
      message: messages.acceptTermsRequired,
      path: ["acceptedTerms"],
    });
}

/** @deprecated Use createLoginSchema with translated messages */
export const loginSchema = createLoginSchema({
  emailRequired: "Valid email is required",
  passwordMin: "Password must be at least 8 characters",
});

/** @deprecated Use createRegisterSchema with translated messages */
export const registerSchema = createRegisterSchema({
  emailRequired: "Valid email is required",
  passwordMin: "Password must be at least 8 characters",
  firstNameRequired: "First name is required",
  lastNameRequired: "Last name is required",
  confirmPasswordRequired: "Confirm your password",
  passwordsMismatch: "Passwords do not match",
  acceptTermsRequired: "You must accept the terms to continue",
});

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
