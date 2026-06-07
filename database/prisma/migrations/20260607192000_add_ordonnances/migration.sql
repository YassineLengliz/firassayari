CREATE TABLE "Ordonnance" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL DEFAULT 'Dr Firas Sayari',
    "doctorShortName" TEXT NOT NULL DEFAULT 'Firas .S',
    "content" TEXT NOT NULL,
    "imageDataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ordonnance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ordonnance_patientId_createdAt_idx" ON "Ordonnance"("patientId", "createdAt");

ALTER TABLE "Ordonnance" ADD CONSTRAINT "Ordonnance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
