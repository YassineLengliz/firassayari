import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsInt, IsString, Min } from "class-validator";
import { RbacGuard } from "../auth/rbac.guard";
import { Roles } from "../auth/roles.decorator";
import { FinanceService } from "./finance.service";

class InvoicePreviewDto {
  @IsString()
  patientName!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;
}

@Controller("finance")
@UseGuards(RbacGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("monthly-summary")
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  monthlySummary() {
    return this.finance.monthlySummary();
  }

  @Post("invoice-preview")
  @Roles("DOCTOR", "SECRETARY")
  invoicePreview(@Body() dto: InvoicePreviewDto) {
    return this.finance.invoicePreview(dto.patientName, dto.amountCents);
  }
}
