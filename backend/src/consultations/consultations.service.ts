import { Injectable } from "@nestjs/common";
import { PRIMARY_DOCTOR } from "@medcabinet/shared";
import { randomUUID } from "crypto";
import { AiService } from "../ai/ai.service";

@Injectable()
export class ConsultationsService {
  constructor(private readonly ai: AiService) {}

  createFromDictation(patientId: string, rawText: string) {
    const structured = this.ai.structureDictation(rawText);
    return {
      id: randomUUID(),
      patientId,
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName,
      symptoms: structured.symptoms,
      diagnosis: structured.diagnosticHypothesis,
      treatment: structured.treatmentPlan,
      prescription: structured.prescription,
      priceCents: structured.priceCents,
      aiSummary: `${structured.reason}. ${structured.symptoms.join(". ")}.`,
      createdAt: new Date().toISOString()
    };
  }
}
