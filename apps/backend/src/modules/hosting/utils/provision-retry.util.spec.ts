import { isTransientProvisionError, withProvisionRetry } from "./provision-retry.util";

describe("provision retry", () => {
  it("retries transient panel failures and returns the recovered value", async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error("Plesk API request timed out"))
      .mockResolvedValue("ok");
    const onRetry = jest.fn();

    const result = await withProvisionRetry(operation, {
      baseDelayMs: 0,
      sleep: async () => undefined,
      onRetry,
    });

    expect(result).toEqual({ value: "ok", attempts: 2 });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not retry permanent credential errors", async () => {
    const operation = jest.fn().mockRejectedValue(new Error("Plesk API auth failed"));

    await expect(withProvisionRetry(operation, { sleep: async () => undefined })).rejects.toThrow(
      "auth failed",
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("classifies infrastructure errors only", () => {
    expect(isTransientProvisionError(new Error("HTTP 503 service unavailable"))).toBe(true);
    expect(isTransientProvisionError(new Error("invalid subscription plan"))).toBe(false);
  });
});
