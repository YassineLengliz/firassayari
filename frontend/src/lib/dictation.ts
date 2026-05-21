import type { StructuredMedicalNote } from "@medcabinet/shared";

export function structureMedicalText(rawText: string): StructuredMedicalNote {
  const normalized = rawText
    .replace(/\b(euh|heu|bah|ben)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const hasFever = /fievre|fièvre|temperature|température/i.test(normalized);
  const hasPain = /douleur|mal|brulure|brûlure/i.test(normalized);
  const duration = normalized.match(/depuis\s+([0-9]+\s+\w+)/i)?.[1] ?? "duree non precisee";

  return {
    reason: hasPain ? `Douleurs rapportees (${duration})` : `Consultation medicale (${duration})`,
    symptoms: [hasFever ? "Fievre associee" : "Fievre non documentee", normalized].filter(Boolean),
    diagnosticHypothesis: hasFever ? "Hypothese infectieuse a confirmer par examen clinique" : "Hypothese a preciser",
    treatmentPlan: "Examen clinique, constantes, conseils hygieno-dietetiques et reevaluation selon evolution.",
    prescription: ["Paracetamol si douleur ou fievre", "Hydratation", "Controle si aggravation"],
    priceCents: 6000
  };
}
