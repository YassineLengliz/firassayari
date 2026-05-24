import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { RbacGuard } from "../auth/rbac.guard";
import { Roles } from "../auth/roles.decorator";
import { ConsultationsService } from "./consultations.service";

class CreateConsultationDto {
  @IsString()
  patientId!: string;

  @IsString()
  @MinLength(3)
  rawDictation!: string;
}

@Controller("consultations")
@UseGuards(RbacGuard)
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @Get()
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  list(@Query("patientId") patientId?: string) {
    return this.consultations.list(patientId);
  }

  @Post("from-dictation")
  @Roles("DOCTOR")
  createFromDictation(@Body() dto: CreateConsultationDto) {
    return this.consultations.createFromDictation(dto.patientId, dto.rawDictation);
  }
}
