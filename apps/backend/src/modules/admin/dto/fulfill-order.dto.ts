import { IsBoolean, IsOptional } from "class-validator";

export class FulfillOrderDto {
  /**
   * Admin override: mark invoice paid manually and activate services
   * that are already live outside the payment gateway (migrations / offline payment).
   * Without this flag, unpaid orders cannot be fulfilled.
   */
  @IsOptional()
  @IsBoolean()
  alreadyDeployed?: boolean;
}
