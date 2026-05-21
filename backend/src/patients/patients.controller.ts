import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IsArray, IsString } from "class-validator";
import { RbacGuard } from "../auth/rbac.guard";
import { Roles } from "../auth/roles.decorator";
import { PatientsService } from "./patients.service";

class CreatePatientDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  phone!: string;

  @IsArray()
  allergies!: string[];

  @IsArray()
  chronicConditions!: string[];
}

@Controller("patients")
@UseGuards(RbacGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  list(@Query("search") search?: string) {
    return this.patients.list(search);
  }

  @Post()
  @Roles("DOCTOR", "SECRETARY")
  create(@Body() dto: CreatePatientDto) {
    return this.patients.create(dto);
  }
}
