import { Injectable } from "@nestjs/common";
import type { StructuredMedicalNote } from "@medcabinet/shared";

@Injectable()
export class AiService {
  structureDictation(rawText: string): StructuredMedicalNote {
    const cleanText = rawText
      .replace(/\b(euh|heu|bah|ben)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const duration = cleanText.match(/depuis\s+([0-9]+\s+\w+)/i)?.[1] ?? "duree non precisee";
    const fever = /fievre|fièvre|temperature|température/i.test(cleanText);

    return {
      reason: /ventre|abdominal/i.test(cleanText) ? `Douleurs abdominales (${duration})` : `Motif a confirmer (${duration})`,
      symptoms: [fever ? "Fievre associee" : "Fievre non documentee", cleanText],
      diagnosticHypothesis: fever ? "Infection digestive probable, a confirmer par examen clinique" : "Hypothese diagnostique non automatique a valider",
      treatmentPlan: "Examen clinique, constantes, evaluation de la douleur et consignes de surveillance.",
      prescription: ["Paracetamol si douleur ou fievre", "Hydratation", "Reconsultation si aggravation"],
      priceCents: 6000
    };
  }
}
