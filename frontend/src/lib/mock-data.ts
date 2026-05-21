import { PRIMARY_DOCTOR, type AppointmentSummary, type PatientSummary } from "@medcabinet/shared";

export const patients: PatientSummary[] = [
  {
    id: "pat-001",
    firstName: "Amira",
    lastName: "Ben Youssef",
    phone: "+216 55 100 200",
    allergies: ["Penicilline"],
    chronicConditions: ["Asthme"]
  },
  {
    id: "pat-002",
    firstName: "Nassim",
    lastName: "Khaled",
    phone: "+216 22 888 410",
    allergies: [],
    chronicConditions: ["Diabete type 2"]
  },
  {
    id: "pat-003",
    firstName: "Sarra",
    lastName: "Mansour",
    phone: "+216 29 441 882",
    allergies: ["AINS"],
    chronicConditions: []
  }
];

export const appointments: AppointmentSummary[] = [
  {
    id: "apt-001",
    patientName: "Amira Ben Youssef",
    doctorName: PRIMARY_DOCTOR.fullName,
    doctorShortName: PRIMARY_DOCTOR.shortName,
    startsAt: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    endsAt: new Date(new Date().setHours(9, 30, 0, 0)).toISOString(),
    status: "CONFIRMED",
    reason: "Douleurs abdominales"
  },
  {
    id: "apt-002",
    patientName: "Nassim Khaled",
    doctorName: PRIMARY_DOCTOR.fullName,
    doctorShortName: PRIMARY_DOCTOR.shortName,
    startsAt: new Date(new Date().setHours(10, 15, 0, 0)).toISOString(),
    endsAt: new Date(new Date().setHours(10, 45, 0, 0)).toISOString(),
    status: "PENDING",
    reason: "Controle glycemie"
  },
  {
    id: "apt-003",
    patientName: "Sarra Mansour",
    doctorName: PRIMARY_DOCTOR.fullName,
    doctorShortName: PRIMARY_DOCTOR.shortName,
    startsAt: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endsAt: new Date(new Date().setHours(14, 45, 0, 0)).toISOString(),
    status: "COMPLETED",
    reason: "Consultation ORL"
  }
];

export const revenueSeries = [
  { month: "Jan", revenue: 8200, consultations: 118 },
  { month: "Fev", revenue: 9100, consultations: 132 },
  { month: "Mar", revenue: 10400, consultations: 147 },
  { month: "Avr", revenue: 9800, consultations: 139 },
  { month: "Mai", revenue: 12650, consultations: 166 }
];
