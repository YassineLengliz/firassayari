import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
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

class RevenueSeriesDto {
  @IsOptional()
  @IsIn(["24h", "7d", "30d", "month"])
  range?: "24h" | "7d" | "30d" | "month";
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

  @Get("activity")
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  activity() {
    return this.finance.activity();
  }

  @Get("revenue-series")
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  revenueSeries(@Query() dto: RevenueSeriesDto) {
    return this.finance.revenueSeries(dto.range ?? "7d");
  }

  @Post("invoice-preview")
  @Roles("DOCTOR", "SECRETARY")
  invoicePreview(@Body() dto: InvoicePreviewDto) {
    return this.finance.invoicePreview(dto.patientName, dto.amountCents);
  }
}
