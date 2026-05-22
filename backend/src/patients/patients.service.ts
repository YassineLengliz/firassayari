import { Injectable } from "@nestjs/common";
import type { PatientSummary } from "@medcabinet/shared";
import { randomUUID } from "crypto";

const patients: PatientSummary[] = [];

@Injectable()
export class PatientsService {
  list(search?: string) {
    if (!search) return patients;
    const needle = search.toLowerCase();
    return patients.filter((patient) => `${patient.firstName} ${patient.lastName} ${patient.phone}`.toLowerCase().includes(needle));
  }

  create(input: Omit<PatientSummary, "id">) {
    const patient = { id: randomUUID(), ...input };
    patients.unshift(patient);
    return patient;
  }
}
