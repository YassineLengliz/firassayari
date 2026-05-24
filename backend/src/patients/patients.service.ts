import { Injectable, NotFoundException } from "@nestjs/common";
import type { AppointmentSummary, PatientDetails, PatientSummary } from "@medcabinet/shared";
import { ensurePrimaryClinic, PRIMARY_CLINIC_ID } from "../common/cabinet-records";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string): Promise<PatientSummary[]> {
    await ensurePrimaryClinic(this.prisma);
    const patients = await this.prisma.patient.findMany({
      where: {
        clinicId: PRIMARY_CLINIC_ID,
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    return patients.map((patient) => this.summary(patient));
  }

  async create(input: Omit<PatientSummary, "id">): Promise<PatientSummary> {
    await ensurePrimaryClinic(this.prisma);
    const patient = await this.prisma.patient.create({
      data: {
        clinicId: PRIMARY_CLINIC_ID,
        ...input
      }
    });

    return this.summary(patient);
  }

  async details(id: string): Promise<PatientDetails> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinicId: PRIMARY_CLINIC_ID },
      include: {
        appointments: { include: { doctor: true }, orderBy: { startsAt: "desc" } },
        consultations: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!patient) throw new NotFoundException("Patient introuvable.");

    return {
      ...this.summary(patient),
      appointments: patient.appointments.map((appointment): AppointmentSummary => ({
        id: appointment.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        doctorName: appointment.doctor.fullName,
        doctorShortName: appointment.doctor.displayName,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status,
        reason: appointment.reason
      })),
      consultations: patient.consultations.map((consultation) => ({
        id: consultation.id,
        patientId: patient.id,
        doctorName: consultation.doctorName,
        symptoms: consultation.symptoms,
        diagnosis: consultation.diagnosis,
        treatment: consultation.treatment,
        medicalActs: consultation.medicalActs,
        priceCents: consultation.priceCents,
        createdAt: consultation.createdAt.toISOString()
      })),
      invoices: patient.invoices.map((invoice) => ({
        id: invoice.id,
        patientId: patient.id,
        number: invoice.number,
        amountCents: invoice.amountCents,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt.toISOString()
      }))
    };
  }

  private summary(patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    address: string | null;
    medicalHistory: string | null;
    allergies: string[];
    chronicConditions: string[];
  }): PatientSummary {
    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      medicalHistory: patient.medicalHistory,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions
    };
  }
}
