import { Injectable } from "@nestjs/common";
import type { PatientSummary } from "@medcabinet/shared";
import { ensurePrimaryClinic, PRIMARY_CLINIC_ID } from "../common/cabinet-records";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string): Promise<PatientSummary[]> {
    await ensurePrimaryClinic(this.prisma);
    const patients = await this.prisma.patient.findMany({
      where: {
        clinicId: PRIMARY_CLINIC_ID,
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    return patients.map((patient) => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions
    }));
  }

  async create(input: Omit<PatientSummary, "id">): Promise<PatientSummary> {
    await ensurePrimaryClinic(this.prisma);
    const patient = await this.prisma.patient.create({
      data: {
        clinicId: PRIMARY_CLINIC_ID,
        ...input
      }
    });

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions
    };
  }
}
