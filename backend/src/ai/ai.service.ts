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
    const swelling = /gonflement|gonfle|abc[eè]s/i.test(cleanText);
    const pain = /douleur|rage de dent|sensible|sensibilite|sensibilité/i.test(cleanText);

    return {
      reason: pain ? `Douleur dentaire (${duration})` : `Motif dentaire a confirmer (${duration})`,
      symptoms: [swelling ? "Gonflement rapporte" : "Gonflement non documente", cleanText],
      diagnosticHypothesis: swelling ? "Infection dentaire a exclure lors de l'examen" : "Diagnostic dentaire a confirmer par le praticien",
      treatmentPlan: "Examen bucco-dentaire, evaluation de la douleur et radiographie si indiquee.",
      prescription: ["Antalgie selon evaluation clinique", "Conseils d'hygiene bucco-dentaire", "Controle si aggravation"],
      priceCents: 6000
    };
  }
}
