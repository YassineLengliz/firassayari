import type { StructuredMedicalNote } from "@medcabinet/shared";

export interface SpeechToTextProvider {
  transcribe(audio: Buffer): Promise<string>;
}

export interface MedicalNlpProvider {
  structure(text: string): Promise<StructuredMedicalNote>;
}

export class WhisperSpeechToText implements SpeechToTextProvider {
  async transcribe(_audio: Buffer): Promise<string> {
    throw new Error("Configure OPENAI_API_KEY and wire the OpenAI audio transcription client here.");
  }
}

export class RuleBasedMedicalNlp implements MedicalNlpProvider {
  async structure(text: string): Promise<StructuredMedicalNote> {
    const clean = text.replace(/\b(euh|heu|bah|ben)\b/gi, "").replace(/\s+/g, " ").trim();
    return {
      reason: /ventre|abdominal/i.test(clean) ? "Douleurs abdominales" : "Motif medical a confirmer",
      symptoms: [clean],
      diagnosticHypothesis: "Suggestion non automatique a valider par le medecin",
      treatmentPlan: "Examen clinique et conduite a tenir documentee par Dr Firas Sayari.",
      prescription: [],
      priceCents: 6000
    };
  }
}
