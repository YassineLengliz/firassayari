import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PRIMARY_DOCTOR, type AppointmentSummary } from "@medcabinet/shared";
import { randomUUID } from "crypto";

const appointments: AppointmentSummary[] = [];

@Injectable()
export class AppointmentsService {
  list(): AppointmentSummary[] {
    return appointments;
  }

  create(input: Omit<AppointmentSummary, "id" | "doctorName" | "doctorShortName">): AppointmentSummary {
    this.assertAvailable(input.startsAt, input.endsAt);

    const appointment: AppointmentSummary = {
      id: randomUUID(),
      ...input,
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName
    };
    appointments.push(appointment);
    return appointment;
  }

  move(id: string, input: Pick<AppointmentSummary, "startsAt" | "endsAt">): AppointmentSummary {
    const appointment = appointments.find((candidate) => candidate.id === id);
    if (!appointment) throw new NotFoundException("Appointment not found");

    this.assertAvailable(input.startsAt, input.endsAt, id);
    appointment.startsAt = input.startsAt;
    appointment.endsAt = input.endsAt;
    return appointment;
  }

  remove(id: string): AppointmentSummary {
    const appointmentIndex = appointments.findIndex((candidate) => candidate.id === id);
    if (appointmentIndex === -1) throw new NotFoundException("Appointment not found");

    const [appointment] = appointments.splice(appointmentIndex, 1);
    return appointment;
  }

  private assertAvailable(startsAtValue: string, endsAtValue: string, ignoredId?: string) {
    const startsAt = new Date(startsAtValue);
    const endsAt = new Date(endsAtValue);

    if (endsAt <= startsAt) {
      throw new BadRequestException("Appointment end must be after its start");
    }

    const overlaps = appointments.some((appointment) => {
      if (appointment.id === ignoredId || appointment.status === "CANCELLED") return false;
      return startsAt < new Date(appointment.endsAt) && endsAt > new Date(appointment.startsAt);
    });

    if (overlaps) {
      throw new BadRequestException("Double booking detected for Dr Firas Sayari");
    }
  }
}
