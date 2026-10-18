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
    provider: provider === "kapital" || provider === "epoint" ? provider : "mock",
    kapital: {
      username: process.env.KAPITAL_USERNAME ?? "",
      password: process.env.KAPITAL_PASSWORD ?? "",
      isDev,
      baseUrl:
        process.env.KAPITAL_BASE_URL ??
        (isDev ? "https://txpgtst.kapitalbank.az" : "https://e-commerce.kapitalbank.az"),
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
    epoint: {
      publicKey: process.env.EPOINT_PUBLIC_KEY ?? "",
      privateKey: process.env.EPOINT_PRIVATE_KEY ?? "",
      baseUrl: (process.env.EPOINT_BASE_URL ?? "https://epoint.az/api/1").replace(/\/$/, ""),
      returnUrl:
        process.env.EPOINT_RETURN_URL ??
        `${process.env.APP_URL ?? "http://localhost:3000"}/payment/result`,
      cardReturnUrl:
        process.env.EPOINT_CARD_RETURN_URL ??
        `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/payments`,
      resultUrl:
        process.env.EPOINT_RESULT_URL ??
        `${process.env.API_PUBLIC_URL ?? "http://localhost:4000/api/v1"}/payments/epoint/callback`,
      language: process.env.EPOINT_LANGUAGE ?? "az",
      allowInsecure: process.env.EPOINT_ALLOW_INSECURE === "true",
    },
  };
});

export type PaymentConfig = ReturnType<typeof paymentConfig>;
