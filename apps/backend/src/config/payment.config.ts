import { registerAs } from "@nestjs/config";

export const paymentConfig = registerAs("payment", () => {
  const provider = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  const isDevFlag = process.env.KAPITAL_IS_DEV?.toLowerCase();
  const isDev =
    isDevFlag === "true"
      ? true
      : isDevFlag === "false"
        ? false
        : process.env.NODE_ENV !== "production";

  return {
    provider: provider === "kapital" ? "kapital" : "mock",
    kapital: {
      username: process.env.KAPITAL_USERNAME ?? "",
      password: process.env.KAPITAL_PASSWORD ?? "",
      isDev,
      baseUrl:
        process.env.KAPITAL_BASE_URL ??
        (isDev
          ? "https://txpgtst.kapitalbank.az"
          : "https://e-commerce.kapitalbank.az"),
      /** Where Kapital redirects the browser after HPP (our public callback). */
      redirectUrl:
        process.env.KAPITAL_REDIRECT_URL ??
        `${process.env.API_PUBLIC_URL ?? "http://localhost:4000/api/v1"}/payments/kapital/callback`,
      /** Where we send the customer after verifying payment. */
      returnUrl:
        process.env.KAPITAL_RETURN_URL ??
        `${process.env.APP_URL ?? "http://localhost:3000"}/payment/result`,
      language: process.env.KAPITAL_LANGUAGE ?? "az",
    },
  };
});

export type PaymentConfig = ReturnType<typeof paymentConfig>;
