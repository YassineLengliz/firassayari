-- Run after database/prisma/migrations/20260522222000_init/migration.sql.
-- Idempotent bootstrap data required for Dr Firas Sayari appointments.

INSERT INTO "Clinic" ("id", "name", "createdAt", "updatedAt")
VALUES ('clinic-firas-sayari', 'Cabinet Dr Firas Sayari', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "User" (
  "id",
  "clinicId",
  "email",
  "passwordHash",
  "fullName",
  "displayName",
  "role",
  "createdAt",
  "updatedAt"
)
VALUES (
  'doctor-firas-sayari',
  'clinic-firas-sayari',
  'firas@medcabinet.ai',
  'managed-by-demo-auth',
  'Dr Firas Sayari',
  'Firas .S',
  'DOCTOR'::"Role",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE
SET "clinicId" = EXCLUDED."clinicId",
    "fullName" = EXCLUDED."fullName",
    "displayName" = EXCLUDED."displayName",
    "role" = EXCLUDED."role",
    "updatedAt" = CURRENT_TIMESTAMP;
