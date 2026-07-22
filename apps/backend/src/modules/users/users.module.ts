import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { UsersController } from "./controller/users.controller";
import { UsersService } from "./service/users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
