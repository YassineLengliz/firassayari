import { Injectable } from "@nestjs/common";
import { PRIMARY_DOCTOR, type ConsultationSummary } from "@medcabinet/shared";
import { AiService } from "../ai/ai.service";
import { PRIMARY_CLINIC_ID } from "../common/cabinet-records";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class ConsultationsService {
  constructor(private readonly ai: AiService, private readonly prisma: PrismaService) {}

  async list(patientId?: string): Promise<ConsultationSummary[]> {
    const consultations = await this.prisma.consultation.findMany({
      where: {
        patient: { clinicId: PRIMARY_CLINIC_ID },
        ...(patientId ? { patientId } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    return consultations.map((consultation) => this.summary(consultation));
  }

  async createFromDictation(patientId: string, rawText: string): Promise<ConsultationSummary> {
    const structured = this.ai.structureDictation(rawText);
    const consultation = await this.prisma.consultation.create({
      data: {
        patientId,
        doctorName: PRIMARY_DOCTOR.fullName,
        doctorShortName: PRIMARY_DOCTOR.shortName,
        symptoms: structured.symptoms.join(" | "),
        diagnosis: structured.diagnosticHypothesis,
        treatment: structured.treatmentPlan,
        medicalActs: structured.prescription,
        priceCents: structured.priceCents,
        aiSummary: `${structured.reason}. ${structured.symptoms.join(". ")}.`,
        diagnosticSuggestion: structured.diagnosticHypothesis
      }
    });
    return this.summary(consultation);
  }

  private summary(consultation: {
    id: string;
    patientId: string;
    doctorName: string;
    symptoms: string;
    diagnosis: string;
    treatment: string;
    medicalActs: string[];
    priceCents: number;
    createdAt: Date;
  }): ConsultationSummary {
    return {
      id: consultation.id,
      patientId: consultation.patientId,
      doctorName: consultation.doctorName,
      symptoms: consultation.symptoms,
      diagnosis: consultation.diagnosis,
      treatment: consultation.treatment,
      medicalActs: consultation.medicalActs,
      priceCents: consultation.priceCents,
      createdAt: consultation.createdAt.toISOString()
    };
  }
}
