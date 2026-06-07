import { Injectable, NotFoundException } from "@nestjs/common";
import { PRIMARY_DOCTOR } from "@medcabinet/shared";
import { PRIMARY_CLINIC_ID } from "../common/cabinet-records";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class OrdonnancesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(patientId?: string) {
    const ordonnances = await this.prisma.ordonnance.findMany({
      where: {
        patient: { clinicId: PRIMARY_CLINIC_ID },
        ...(patientId ? { patientId } : {})
      },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return ordonnances.map((ordonnance) => ({
      id: ordonnance.id,
      patientId: ordonnance.patientId,
      patientName: `${ordonnance.patient.firstName} ${ordonnance.patient.lastName}`.trim(),
      doctorName: ordonnance.doctorName,
      doctorShortName: ordonnance.doctorShortName,
      content: ordonnance.content,
      imageDataUrl: ordonnance.imageDataUrl,
      createdAt: ordonnance.createdAt.toISOString()
    }));
  }

  async create(input: { patientId: string; content: string; imageDataUrl: string }) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: PRIMARY_CLINIC_ID }
    });
    if (!patient) throw new NotFoundException("Patient introuvable.");

    const ordonnance = await this.prisma.ordonnance.create({
      data: {
        patientId: input.patientId,
        doctorName: PRIMARY_DOCTOR.fullName,
        doctorShortName: PRIMARY_DOCTOR.shortName,
        content: input.content,
        imageDataUrl: input.imageDataUrl
      },
      include: { patient: true }
    });

    return {
      id: ordonnance.id,
      patientId: ordonnance.patientId,
      patientName: `${ordonnance.patient.firstName} ${ordonnance.patient.lastName}`.trim(),
      doctorName: ordonnance.doctorName,
      doctorShortName: ordonnance.doctorShortName,
      content: ordonnance.content,
      imageDataUrl: ordonnance.imageDataUrl,
      createdAt: ordonnance.createdAt.toISOString()
    };
  }
}
