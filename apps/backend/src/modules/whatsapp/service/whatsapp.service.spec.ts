import { WhatsappService } from "./whatsapp.service";

describe("WhatsappService gateway pool", () => {
  const account = (id: string) => ({ id, status: "CONNECTED", isEnabled: true });

  it("fails over once to a different least-loaded connected account", async () => {
    const repository = {
      listEligibleGatewayAccounts: jest
        .fn()
        .mockResolvedValueOnce([account("first"), account("second")])
        .mockResolvedValueOnce([account("second")]),
      recordGatewayFailure: jest.fn().mockResolvedValue(undefined),
      recordGatewaySuccess: jest.fn().mockResolvedValue(undefined),
      createMessageLog: jest.fn().mockResolvedValue({ id: "log", status: "SENT" }),
    };
    const session = {
      isConnected: jest.fn().mockReturnValue(true),
      sendText: jest
        .fn()
        .mockRejectedValueOnce(new Error("temporary"))
        .mockResolvedValueOnce(undefined),
    };
    const smtp = { send: jest.fn() };
    const config = { get: jest.fn().mockReturnValue("hasimovtabriz@gmail.com") };
    const service = new WhatsappService(
      repository as never,
      session as never,
      smtp as never,
      config as never,
    );

    await service.sendSystemText({ phone: "+994501234567", message: "test" });

    expect(session.sendText).toHaveBeenNthCalledWith(
      1,
      "first",
      "994501234567@s.whatsapp.net",
      "test",
    );
    expect(session.sendText).toHaveBeenNthCalledWith(
      2,
      "second",
      "994501234567@s.whatsapp.net",
      "test",
    );
    expect(repository.recordGatewayFailure).toHaveBeenCalledWith("first", "temporary");
    expect(repository.recordGatewaySuccess).toHaveBeenCalledWith("second");
    expect(smtp.send).not.toHaveBeenCalled();
  });

  it("stops after two failures and emits one sanitized alert", async () => {
    const repository = {
      listEligibleGatewayAccounts: jest
        .fn()
        .mockResolvedValueOnce([account("first"), account("second")])
        .mockResolvedValueOnce([account("second")]),
      recordGatewayFailure: jest.fn().mockResolvedValue(undefined),
      recordGatewaySuccess: jest.fn(),
      createMessageLog: jest.fn().mockResolvedValue({ id: "log", status: "FAILED" }),
    };
    const session = {
      isConnected: jest.fn().mockReturnValue(true),
      sendText: jest.fn().mockRejectedValue(new Error("provider unavailable")),
    };
    const smtp = { send: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue("hasimovtabriz@gmail.com") };
    const service = new WhatsappService(
      repository as never,
      session as never,
      smtp as never,
      config as never,
    );

    await expect(
      service.sendSystemText({
        phone: "+994501234567",
        message: "private body must not be emailed",
      }),
    ).rejects.toThrow("WHATSAPP_GATEWAY_UNAVAILABLE");

    expect(session.sendText).toHaveBeenCalledTimes(2);
    expect(smtp.send).toHaveBeenCalledTimes(1);
    const [, alert] = smtp.send.mock.calls[0] as [string, { text: string; html: string }];
    expect(alert.text).toContain("Attempts: 2");
    expect(alert.text).not.toContain("private body must not be emailed");
    expect(alert.text).not.toContain("994501234567");
    expect(alert.text).not.toContain("provider unavailable");
  });
});
