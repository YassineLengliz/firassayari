import type { StructuredMedicalNote } from "@medcabinet/shared";

export function structureMedicalText(rawText: string): StructuredMedicalNote {
  const normalized = rawText
    .replace(/\b(euh|heu|bah|ben)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const hasSwelling = /gonflement|gonfle|abc[eè]s/i.test(normalized);
  const hasPain = /douleur|rage de dent|sensible|sensibilite|sensibilité/i.test(normalized);
  const duration = normalized.match(/depuis\s+([0-9]+\s+\w+)/i)?.[1] ?? "duree non precisee";

  return {
    reason: hasPain ? `Douleur dentaire (${duration})` : `Consultation dentaire (${duration})`,
    symptoms: [hasSwelling ? "Gonflement rapporte" : "Gonflement non documente", normalized].filter(Boolean),
    diagnosticHypothesis: hasSwelling ? "Infection dentaire a exclure lors de l'examen" : "Diagnostic a preciser",
    treatmentPlan: "Examen bucco-dentaire, evaluation de la douleur et radiographie si indiquee.",
    prescription: ["Antalgie selon evaluation clinique", "Conseils d'hygiene bucco-dentaire", "Controle si aggravation"],
    priceCents: 6000
  };
}
