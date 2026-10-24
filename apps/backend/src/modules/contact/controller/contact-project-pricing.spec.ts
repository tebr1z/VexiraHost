import { ConflictException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import type { Request } from "express";

import { SubmitInquiryDto } from "../dto/submit-inquiry.dto";

import { ContactController } from "./contact.controller";

describe("project proposal inquiry integration", () => {
  function fixture() {
    const contact = { submit: jest.fn().mockResolvedValue({ message: "Inquiry received" }) };
    const pricing = {
      proposalSummary: jest.fn().mockResolvedValue("Trusted estimate: 719.10 AZN"),
    };
    const turnstile = { assertValid: jest.fn() };
    const access = { assertSectionOpen: jest.fn() };
    type Args = ConstructorParameters<typeof ContactController>;
    const controller = new ContactController(
      contact as unknown as Args[0],
      pricing as unknown as Args[1],
      turnstile as unknown as Args[2],
      access as unknown as Args[3],
    );
    const request = { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as Request;
    const body: SubmitInquiryDto = {
      kind: "contact",
      name: "Test Customer",
      email: "test@example.test",
      message: "Please build our company website.",
    };
    return { contact, pricing, turnstile, access, controller, request, body };
  }
  it("keeps regular contact forms working without a pricing lookup", async () => {
    const { controller, request, body, pricing, contact } = fixture();
    await controller.contact(body, request);
    expect(pricing.proposalSummary).not.toHaveBeenCalled();
    expect(contact.submit).toHaveBeenCalledWith(body, "127.0.0.1");
  });
  it("appends the server-calculated estimate while retaining spam and site-access checks", async () => {
    const { controller, request, body, pricing, contact, access, turnstile } = fixture();
    body.projectQuote = {
      package: "company",
      pages: 5,
      languages: 1,
      features: [],
      pricingUpdatedAt: null,
    };
    await controller.contact(body, request);
    expect(access.assertSectionOpen).toHaveBeenCalledWith("contact");
    expect(turnstile.assertValid).toHaveBeenCalled();
    expect(pricing.proposalSummary).toHaveBeenCalledWith(body.projectQuote);
    expect(contact.submit.mock.calls[0][0].message).toContain("Trusted estimate: 719.10 AZN");
    expect(contact.submit.mock.calls[0][0].message).toContain("Please build our company website.");
  });
  it("does not send a proposal when the displayed prices are stale", async () => {
    const { controller, request, body, pricing, contact } = fixture();
    body.projectQuote = {
      package: "company",
      pages: 5,
      languages: 1,
      features: [],
      pricingUpdatedAt: null,
    };
    pricing.proposalSummary.mockRejectedValue(new ConflictException("Project pricing changed"));
    await expect(controller.contact(body, request)).rejects.toThrow(ConflictException);
    expect(contact.submit).not.toHaveBeenCalled();
  });
  it("rejects a forged client total inside the structured selection", () => {
    const { body } = fixture();
    const dto = plainToInstance(SubmitInquiryDto, {
      ...body,
      projectQuote: {
        package: "company",
        pages: 5,
        languages: 1,
        features: [],
        pricingUpdatedAt: null,
        total: 1,
      },
    });
    expect(
      validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length,
    ).toBeGreaterThan(0);
  });
});
