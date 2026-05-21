import { BadRequestException, Injectable } from "@nestjs/common";
import { PRIMARY_DOCTOR, type AppointmentSummary } from "@medcabinet/shared";
import { randomUUID } from "crypto";

const appointments: AppointmentSummary[] = [];

@Injectable()
export class AppointmentsService {
  list(): AppointmentSummary[] {
    return appointments;
  }

  create(input: Omit<AppointmentSummary, "id" | "doctorName" | "doctorShortName">): AppointmentSummary {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    const overlaps = appointments.some((appointment) => {
      if (appointment.status === "CANCELLED") return false;
      return startsAt < new Date(appointment.endsAt) && endsAt > new Date(appointment.startsAt);
    });

    if (overlaps) {
      throw new BadRequestException("Double booking detected for Dr Firas Sayari");
    }

    const appointment: AppointmentSummary = {
      id: randomUUID(),
      ...input,
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName
    };
    appointments.push(appointment);
    return appointment;
  }
}
