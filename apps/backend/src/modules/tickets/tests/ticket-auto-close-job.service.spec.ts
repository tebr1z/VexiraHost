import { TicketsRepository } from "../repository/tickets.repository";
import { TicketAutoCloseJobService } from "../service/ticket-auto-close-job.service";
import { TicketEmailService } from "../service/ticket-email.service";

import { PrismaService } from "@/database/database.module";

describe("TicketAutoCloseJobService", () => {
  const now = new Date("2026-10-19T12:00:00.000Z").getTime();

  function createFixture() {
    const ticket = {
      id: "ticket-1",
      subject: "Hosting dəstəyi",
      status: "OPEN",
      user: {
        id: "user-1",
        email: "customer@example.com",
        firstName: "Təbriz",
        lastName: "Həşimov",
        preferredCurrency: "AZN",
        localeHistory: ["az"],
      },
    };
    const repository = {
      findExpiredOpenTickets: jest.fn().mockResolvedValue([ticket]),
      closeIfActive: jest.fn().mockResolvedValue({ ...ticket, status: "CLOSED" }),
    };
    const email = {
      sendTicketAutoClosedEmail: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      notification: { create: jest.fn().mockResolvedValue({ id: "notification-1" }) },
    };

    const service = new TicketAutoCloseJobService(
      repository as unknown as TicketsRepository,
      email as unknown as TicketEmailService,
      prisma as unknown as PrismaService,
    );
    return { service, repository, email, prisma };
  }

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("closes active tickets 12 hours after creation and notifies the customer", async () => {
    const fixture = createFixture();

    await fixture.service.tick();

    expect(fixture.repository.findExpiredOpenTickets).toHaveBeenCalledWith(
      new Date("2026-10-19T00:00:00.000Z"),
    );
    expect(fixture.repository.closeIfActive).toHaveBeenCalledWith("ticket-1");
    expect(fixture.prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          title: "Bilet avtomatik bağlandı",
          href: "/dashboard/tickets/ticket-1",
          meta: expect.objectContaining({
            ticketId: "ticket-1",
            autoCloseHours: 12,
          }),
        }),
      }),
    );
    expect(fixture.email.sendTicketAutoClosedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "ticket-1", hours: 12 }),
    );
  });

  it("does not notify when the ticket is no longer active", async () => {
    const fixture = createFixture();
    fixture.repository.closeIfActive.mockResolvedValueOnce(null);

    await fixture.service.tick();

    expect(fixture.prisma.notification.create).not.toHaveBeenCalled();
    expect(fixture.email.sendTicketAutoClosedEmail).not.toHaveBeenCalled();
  });

  it("still sends email when creating the panel notification fails", async () => {
    const fixture = createFixture();
    fixture.prisma.notification.create.mockRejectedValueOnce(new Error("database unavailable"));

    await fixture.service.tick();

    expect(fixture.email.sendTicketAutoClosedEmail).toHaveBeenCalledTimes(1);
  });
});
