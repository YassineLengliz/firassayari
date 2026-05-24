import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PRIMARY_DOCTOR, type AppointmentStatus, type AppointmentSummary, type PublicBusyPeriod } from "@medcabinet/shared";
import { ensurePrimaryDoctor, PRIMARY_CLINIC_ID } from "../common/cabinet-records";
import { PrismaService } from "../common/prisma/prisma.service";

type CreateAppointmentInput = Omit<AppointmentSummary, "id" | "patientId" | "doctorName" | "doctorShortName"> & {
  patientPhone?: string;
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async busyPeriods(fromValue: string, toValue: string): Promise<PublicBusyPeriod[]> {
    const from = new Date(fromValue);
    const to = new Date(toValue);

    if (to <= from || to.getTime() - from.getTime() > 7 * 24 * 60 * 60_000) {
      throw new BadRequestException("Availability range must be between one minute and seven days.");
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId: PRIMARY_CLINIC_ID,
        status: { not: "CANCELLED" },
        startsAt: { lt: to },
        endsAt: { gt: from }
      },
      select: { startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" }
    });

    return appointments.map(({ startsAt, endsAt }) => ({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString()
    }));
  }

  async list(): Promise<AppointmentSummary[]> {
    await ensurePrimaryDoctor(this.prisma);
    const appointments = await this.prisma.appointment.findMany({
      where: { clinicId: PRIMARY_CLINIC_ID },
      include: { patient: true, doctor: true },
      orderBy: { startsAt: "asc" }
    });

    return appointments.map((appointment) => this.summary(appointment));
  }

  async create(input: CreateAppointmentInput): Promise<AppointmentSummary> {
    await ensurePrimaryDoctor(this.prisma);
    await this.assertAvailable(input.startsAt, input.endsAt);
    const patient = await this.patientForAppointment(input.patientName, input.patientPhone);

    const appointment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.appointment.create({
        data: {
          clinicId: PRIMARY_CLINIC_ID,
          patientId: patient.id,
          doctorId: PRIMARY_DOCTOR.id,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          status: input.status,
          reason: input.reason
        },
        include: { patient: true, doctor: true }
      });
      if (input.status === "CONFIRMED") {
        await this.recordConfirmationPayment(transaction, created.id, patient.id);
      }
      return created;
    });

    return this.summary(appointment);
  }

  async move(id: string, input: Pick<AppointmentSummary, "startsAt" | "endsAt">): Promise<AppointmentSummary> {
    await this.assertExists(id);
    await this.assertAvailable(input.startsAt, input.endsAt, id);
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt)
      },
      include: { patient: true, doctor: true }
    });

    return this.summary(appointment);
  }

  async remove(id: string): Promise<AppointmentSummary> {
    await this.assertExists(id);
    const appointment = await this.prisma.appointment.delete({
      where: { id },
      include: { patient: true, doctor: true }
    });

    return this.summary(appointment);
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentSummary> {
    await this.assertExists(id);
    const appointment = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.appointment.update({
        where: { id },
        data: { status },
        include: { patient: true, doctor: true }
      });
      if (status === "CONFIRMED") {
        await this.recordConfirmationPayment(transaction, updated.id, updated.patientId);
      }
      return updated;
    });

    return this.summary(appointment);
  }

  private async assertAvailable(startsAtValue: string, endsAtValue: string, ignoredId?: string) {
    const startsAt = new Date(startsAtValue);
    const endsAt = new Date(endsAtValue);

    if (endsAt <= startsAt) {
      throw new BadRequestException("Appointment end must be after its start");
    }

    const overlaps = await this.prisma.appointment.count({
      where: {
        clinicId: PRIMARY_CLINIC_ID,
        status: { not: "CANCELLED" },
        ...(ignoredId ? { id: { not: ignoredId } } : {}),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt }
      }
    });

    if (overlaps) {
      throw new BadRequestException("Ce creneau est deja occupe.");
    }
  }

  private async assertExists(id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId: PRIMARY_CLINIC_ID },
      select: { id: true }
    });

    if (!appointment) throw new NotFoundException("Appointment not found");
  }

  private async patientForAppointment(patientName: string, patientPhone = "") {
    const name = splitPatientName(patientName);
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        clinicId: PRIMARY_CLINIC_ID,
        firstName: { equals: name.firstName, mode: "insensitive" },
        lastName: { equals: name.lastName, mode: "insensitive" }
      }
    });

    if (existingPatient) {
      if (patientPhone && !existingPatient.phone) {
        return this.prisma.patient.update({
          where: { id: existingPatient.id },
          data: { phone: patientPhone }
        });
      }
      return existingPatient;
    }

    return this.prisma.patient.create({
      data: {
        clinicId: PRIMARY_CLINIC_ID,
        firstName: name.firstName,
        lastName: name.lastName,
        phone: patientPhone,
        allergies: [],
        chronicConditions: []
      }
    });
  }

  private recordConfirmationPayment(
    transaction: Pick<PrismaService, "invoice">,
    appointmentId: string,
    patientId: string
  ) {
    return transaction.invoice.upsert({
      where: { number: `RDV-${appointmentId}` },
      update: {},
      create: {
        clinicId: PRIMARY_CLINIC_ID,
        patientId,
        number: `RDV-${appointmentId}`,
        doctorName: PRIMARY_DOCTOR.fullName,
        doctorShortName: PRIMARY_DOCTOR.shortName,
        amountCents: 4000,
        paidAt: new Date(),
        paymentMethod: "CASH"
      }
    });
  }

  private summary(appointment: {
    id: string;
    patientId: string;
    startsAt: Date;
    endsAt: Date;
    status: AppointmentSummary["status"];
    reason: string;
    patient: { firstName: string; lastName: string };
    doctor: { fullName: string; displayName: string };
  }): AppointmentSummary {
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim(),
      doctorName: appointment.doctor.fullName,
      doctorShortName: appointment.doctor.displayName,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
      reason: appointment.reason
    };
  }
}

function splitPatientName(patientName: string) {
  const [firstName, ...lastNameParts] = patientName.trim().split(/\s+/);
  return {
    firstName: firstName || "Patient",
    lastName: lastNameParts.join(" ")
  };
}
