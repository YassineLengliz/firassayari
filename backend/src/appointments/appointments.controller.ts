import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsDateString, IsIn, IsString } from "class-validator";
import type { AppointmentStatus } from "@medcabinet/shared";
import { Roles } from "../auth/roles.decorator";
import { RbacGuard } from "../auth/rbac.guard";
import { AppointmentsService } from "./appointments.service";

class CreateAppointmentDto {
  @IsString()
  patientName!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsIn(["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED"])
  status!: AppointmentStatus;

  @IsString()
  reason!: string;
}

class RequestAppointmentDto {
  @IsString()
  patientName!: string;

  @IsString()
  phone!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsString()
  reason!: string;
}

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @UseGuards(RbacGuard)
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  list() {
    return this.appointments.list();
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles("DOCTOR", "SECRETARY")
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointments.create(dto);
  }

  @Post("requests")
  request(@Body() dto: RequestAppointmentDto) {
    return this.appointments.create({
      patientName: dto.patientName,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      status: "PENDING",
      reason: `${dto.reason} | Tel: ${dto.phone}`
    });
  }
}
