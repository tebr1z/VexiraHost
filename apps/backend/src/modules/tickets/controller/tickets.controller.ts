import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AuthUser } from "@vexira/types";
import type { Request, Response } from "express";

import { CreateTicketDto, ReplyTicketDto } from "../dto";
import { TicketsService } from "../service/tickets.service";

import { User } from "@/decorators/user.decorator";
import { getClientIp } from "@/utils/client-ip.util";

@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@User() user: AuthUser) {
    return this.ticketsService.listForUser(user.id);
  }

  @Get("related-services")
  listRelatedServices(@User() user: AuthUser) {
    return this.ticketsService.listRelatedServices(user.id);
  }

  @Get("attachments/:attachmentId")
  async downloadAttachment(
    @Param("attachmentId") attachmentId: string,
    @User() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.ticketsService.downloadAttachment(
      attachmentId,
      user.id,
      user.role,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @User() user: AuthUser, @Req() req: Request) {
    return this.ticketsService.create(user.id, dto, getClientIp(req));
  }

  @Get(":id")
  getOne(@Param("id") id: string, @User() user: AuthUser) {
    return this.ticketsService.getForUser(id, user.id, user.role);
  }

  @Post(":id/reply")
  reply(@Param("id") id: string, @Body() dto: ReplyTicketDto, @User() user: AuthUser) {
    return this.ticketsService.reply(id, user.id, user.role, dto);
  }

  @Post(":id/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAttachment(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @User() user: AuthUser,
  ) {
    return this.ticketsService.uploadAttachment(id, user.id, user.role, file);
  }
}
