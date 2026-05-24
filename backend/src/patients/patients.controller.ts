import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IsArray, IsOptional, IsString } from "class-validator";
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

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

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

  @Get(":id")
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  details(@Param("id") id: string) {
    return this.patients.details(id);
  }

  @Post()
  @Roles("DOCTOR", "SECRETARY")
  create(@Body() dto: CreatePatientDto) {
    return this.patients.create(dto);
  }
}
