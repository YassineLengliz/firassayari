export const PRIMARY_DOCTOR = {
  id: "doctor-firas-sayari",
  fullName: "Dr Firas Sayari",
  shortName: "Firas .S",
  specialty: "Dentiste"
} as const;

export type UserRole = "DOCTOR" | "SECRETARY" | "SAAS_ADMIN";

export type AppointmentStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED";

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  allergies: string[];
  chronicConditions: string[];
}

export interface AppointmentSummary {
  id: string;
  patientName: string;
  doctorName: string;
  doctorShortName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string;
}

export interface StructuredMedicalNote {
  reason: string;
  symptoms: string[];
  diagnosticHypothesis: string;
  treatmentPlan: string;
  prescription: string[];
  priceCents: number;
}
