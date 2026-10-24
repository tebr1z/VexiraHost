import { describe, it, expect } from "vitest";

import { isKapitalPaymentUrl, isBankReturnMessage } from "./bank-payment";
describe("bank payment frame boundary", () => {
  it("allows only the exact HTTPS Kapital hosted form with a bank order", () => {
    expect(
      isKapitalPaymentUrl("https://e-commerce.kapitalbank.az/flex?id=123&password=secret"),
    ).toBe(true);
    expect(isKapitalPaymentUrl("https://txpgtst.kapitalbank.az/flex?id=123&password=secret")).toBe(
      true,
    );
  });
  it.each([
    "https://e-commerce.kapitalbank.az.evil.test/flex?id=1&password=x",
    "http://e-commerce.kapitalbank.az/flex?id=1&password=x",
    "https://user:pass@e-commerce.kapitalbank.az/flex?id=1&password=x",
    "https://e-commerce.kapitalbank.az:8443/flex?id=1&password=x",
    "https://e-commerce.kapitalbank.az/other?id=1&password=x",
    "https://e-commerce.kapitalbank.az/flex?id=1",
    "javascript:alert(1)",
  ])("rejects an untrusted frame URL %s", (url) => expect(isKapitalPaymentUrl(url)).toBe(false));
  it("accepts return notifications only from this exact same-origin frame", () => {
    const frame = {};
    const message = {
      origin: "https://vexirahost.com",
      source: frame,
      data: { type: "vexira:bank-return" },
    };
    expect(isBankReturnMessage(message, message.origin, frame)).toBe(true);
    expect(
      isBankReturnMessage({ ...message, origin: "https://evil.test" }, message.origin, frame),
    ).toBe(false);
    expect(isBankReturnMessage({ ...message, source: {} }, message.origin, frame)).toBe(false);
    expect(isBankReturnMessage({ ...message, data: { type: "paid" } }, message.origin, frame)).toBe(
      false,
    );
    expect(isBankReturnMessage(message, message.origin, null)).toBe(false);
  });
});
