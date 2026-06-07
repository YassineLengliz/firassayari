import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { RbacGuard } from "../auth/rbac.guard";
import { OrdonnancesService } from "./ordonnances.service";

class CreateOrdonnanceDto {
  @IsString()
  patientId!: string;

  @IsString()
  content!: string;

  @IsString()
  imageDataUrl!: string;
}

@Controller("ordonnances")
@UseGuards(RbacGuard)
export class OrdonnancesController {
  constructor(private readonly ordonnances: OrdonnancesService) {}

  @Get()
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  list(@Query("patientId") patientId?: string) {
    return this.ordonnances.list(patientId);
  }

  @Post()
  @Roles("DOCTOR", "SECRETARY")
  create(@Body() dto: CreateOrdonnanceDto) {
    return this.ordonnances.create(dto);
  }
}
