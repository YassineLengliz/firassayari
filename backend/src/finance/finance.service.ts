import { Injectable } from "@nestjs/common";
import { PRIMARY_DOCTOR } from "@medcabinet/shared";

@Injectable()
export class FinanceService {
  monthlySummary() {
    return {
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName,
      month: new Date().toISOString().slice(0, 7),
      revenueCents: 0,
      unpaidCents: 0,
      invoices: 0,
      payments: {
        cashCents: 0,
        cardCents: 0
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
