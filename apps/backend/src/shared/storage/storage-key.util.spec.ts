import { assertStorageKey } from "./storage-key.util";

describe("storage object keys", () => {
  it("accepts namespaced object keys", () => {
    expect(assertStorageKey("tickets/ticket-1/file.pdf")).toBe("tickets/ticket-1/file.pdf");
  });

  it.each(["../secret", "tickets/../secret", "tickets//file", "./file", ""])(
    "rejects unsafe key %p",
    (key) => expect(() => assertStorageKey(key)).toThrow("Invalid storage object key"),
  );
});
