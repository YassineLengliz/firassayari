import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import type { AppointmentStatus } from "@medcabinet/shared";
import { Roles } from "../auth/roles.decorator";
import { RbacGuard } from "../auth/rbac.guard";
import { AppointmentsService } from "./appointments.service";

class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  patientId?: string;

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

  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmountCents?: number;
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

class MoveAppointmentDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

class UpdateAppointmentStatusDto {
  @IsIn(["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED"])
  status!: AppointmentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmountCents?: number;
}

class PublicAvailabilityDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get("availability")
  availability(@Query() dto: PublicAvailabilityDto) {
    return this.appointments.busyPeriods(dto.from, dto.to);
  }

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

  @Patch(":id/move")
  @UseGuards(RbacGuard)
  @Roles("DOCTOR", "SECRETARY")
  move(@Param("id") id: string, @Body() dto: MoveAppointmentDto) {
    return this.appointments.move(id, dto);
  }

  @Patch(":id/status")
  @UseGuards(RbacGuard)
  @Roles("DOCTOR", "SECRETARY")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.appointments.updateStatus(id, dto.status, dto.paidAmountCents);
  }

  @Delete(":id")
  @UseGuards(RbacGuard)
  @Roles("DOCTOR", "SECRETARY")
  remove(@Param("id") id: string) {
    return this.appointments.remove(id);
  }

  @Post("requests")
  request(@Body() dto: RequestAppointmentDto) {
    return this.appointments.create({
      patientName: dto.patientName,
      patientPhone: dto.phone,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      status: "PENDING",
      reason: dto.reason
    });
  }
}
