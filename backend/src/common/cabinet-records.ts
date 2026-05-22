import { PRIMARY_DOCTOR } from "@medcabinet/shared";
import { PrismaService } from "./prisma/prisma.service";

export const PRIMARY_CLINIC_ID = "clinic-firas-sayari";

export async function ensurePrimaryClinic(prisma: PrismaService) {
  return prisma.clinic.upsert({
    where: { id: PRIMARY_CLINIC_ID },
    update: { name: `Cabinet ${PRIMARY_DOCTOR.fullName}` },
    create: {
      id: PRIMARY_CLINIC_ID,
      name: `Cabinet ${PRIMARY_DOCTOR.fullName}`
    }
  });
}

export async function ensurePrimaryDoctor(prisma: PrismaService) {
  await ensurePrimaryClinic(prisma);

  return prisma.user.upsert({
    where: { id: PRIMARY_DOCTOR.id },
    update: {
      clinicId: PRIMARY_CLINIC_ID,
      fullName: PRIMARY_DOCTOR.fullName,
      displayName: PRIMARY_DOCTOR.shortName,
      role: "DOCTOR"
    },
    create: {
      id: PRIMARY_DOCTOR.id,
      clinicId: PRIMARY_CLINIC_ID,
      email: "firas@medcabinet.ai",
      passwordHash: "managed-by-demo-auth",
      fullName: PRIMARY_DOCTOR.fullName,
      displayName: PRIMARY_DOCTOR.shortName,
      role: "DOCTOR"
    }
  });
}
