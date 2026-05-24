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
  email?: string | null;
  address?: string | null;
  medicalHistory?: string | null;
  allergies: string[];
  chronicConditions: string[];
}

export interface AppointmentSummary {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  doctorShortName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string;
}

export interface ConsultationSummary {
  id: string;
  patientId: string;
  doctorName: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  medicalActs: string[];
  priceCents: number;
  createdAt: string;
}

export interface InvoiceSummary {
  id: string;
  patientId: string;
  number: string;
  amountCents: number;
  paidAt: string | null;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | null;
  createdAt: string;
}

export interface PatientDetails extends PatientSummary {
  appointments: AppointmentSummary[];
  consultations: ConsultationSummary[];
  invoices: InvoiceSummary[];
}

export interface PublicBusyPeriod {
  startsAt: string;
  endsAt: string;
}

export interface StructuredMedicalNote {
  reason: string;
  symptoms: string[];
  diagnosticHypothesis: string;
  treatmentPlan: string;
  prescription: string[];
  priceCents: number;
}
