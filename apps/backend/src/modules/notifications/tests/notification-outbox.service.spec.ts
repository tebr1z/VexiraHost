import { NotificationOutboxChannel, NotificationOutboxStatus } from "@prisma/client";

import { NotificationTemplate } from "../notification-outbox.constants";
import { NotificationOutboxProcessorService } from "../service/notification-outbox-processor.service";
import { NotificationOutboxService } from "../service/notification-outbox.service";

describe("NotificationOutboxService", () => {
  it("persists an idempotent message before queuing it", async () => {
    const item = { id: "outbox-1", status: NotificationOutboxStatus.PENDING };
    const prisma = { notificationOutbox: { upsert: jest.fn().mockResolvedValue(item) } };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const processor = { deliver: jest.fn() };
    const service = new NotificationOutboxService(
      prisma as never,
      processor as never,
      queue as never,
    );

    await service.enqueue({
      userId: "user-1",
      channel: NotificationOutboxChannel.WHATSAPP,
      recipient: "+994501234567",
      template: NotificationTemplate.TEXT,
      payload: { message: "Pay now" },
      dedupeKey: "invoice:1:whatsapp",
    });

    expect(prisma.notificationOutbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dedupeKey: "invoice:1:whatsapp" } }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      "deliver",
      { outboxId: "outbox-1" },
      expect.objectContaining({ jobId: "outbox-1", attempts: 6 }),
    );
  });

  it("does not enqueue an already delivered duplicate", async () => {
    const prisma = {
      notificationOutbox: {
        upsert: jest
          .fn()
          .mockResolvedValue({ id: "outbox-1", status: NotificationOutboxStatus.SENT }),
      },
    };
    const queue = { add: jest.fn() };
    const service = new NotificationOutboxService(
      prisma as never,
      { deliver: jest.fn() } as never,
      queue as never,
    );

    await service.enqueue({
      channel: NotificationOutboxChannel.EMAIL,
      recipient: "user@example.com",
      template: NotificationTemplate.RAW_EMAIL,
      payload: { subject: "x", text: "x", html: "<p>x</p>" },
      dedupeKey: "same-message",
    });

    expect(queue.add).not.toHaveBeenCalled();
  });
});

describe("NotificationOutboxProcessorService", () => {
  const pending = {
    id: "outbox-1",
    attempts: 1,
    channel: NotificationOutboxChannel.WHATSAPP,
    template: NotificationTemplate.TEXT,
    recipient: "+994501234567",
    payload: { userId: "user-1", message: "Hello" },
  };

  it("marks a delivered message as sent", async () => {
    const prisma = {
      notificationOutbox: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(pending),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const whatsapp = { sendSystemText: jest.fn().mockResolvedValue(undefined) };
    const processor = new NotificationOutboxProcessorService(
      prisma as never,
      { isConfigured: jest.fn() } as never,
      { sendRenewalInvoiceEmail: jest.fn() } as never,
      whatsapp as never,
    );

    await processor.deliver("outbox-1");

    expect(whatsapp.sendSystemText).toHaveBeenCalledWith({
      phone: "+994501234567",
      userId: "user-1",
      message: "Hello",
    });
    expect(prisma.notificationOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationOutboxStatus.SENT }),
      }),
    );
  });

  it("keeps a failed message retryable", async () => {
    const prisma = {
      notificationOutbox: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(pending),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const processor = new NotificationOutboxProcessorService(
      prisma as never,
      { isConfigured: jest.fn() } as never,
      { sendRenewalInvoiceEmail: jest.fn() } as never,
      { sendSystemText: jest.fn().mockRejectedValue(new Error("provider down")) } as never,
    );

    await expect(processor.deliver("outbox-1")).rejects.toThrow("provider down");
    expect(prisma.notificationOutbox.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationOutboxStatus.FAILED,
          lastError: "provider down",
        }),
      }),
    );
  });
});
