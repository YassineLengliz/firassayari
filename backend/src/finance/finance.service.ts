import { Injectable } from "@nestjs/common";
import { PRIMARY_DOCTOR } from "@medcabinet/shared";

@Injectable()
export class FinanceService {
  monthlySummary() {
    return {
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName,
      month: "2026-05",
      revenueCents: 1265000,
      unpaidCents: 180000,
      invoices: 166,
      payments: {
        cashCents: 426000,
        cardCents: 839000
      }
    };
  }

  invoicePreview(patientName: string, amountCents: number) {
    return {
      number: `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName,
      patientName,
      amountCents,
      pdfStatus: "ready-to-render"
    };
  }
}
