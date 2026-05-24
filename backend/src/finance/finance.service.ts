import { Injectable } from "@nestjs/common";
import { PRIMARY_DOCTOR } from "@medcabinet/shared";
import { PRIMARY_CLINIC_ID } from "../common/cabinet-records";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlySummary() {
    const from = new Date();
    from.setUTCDate(1);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);
    const invoices = await this.prisma.invoice.findMany({
      where: { clinicId: PRIMARY_CLINIC_ID, createdAt: { gte: from, lt: to } }
    });
    const paid = invoices.filter((invoice) => invoice.paidAt);
    const unpaid = invoices.filter((invoice) => !invoice.paidAt);

    return {
      doctorName: PRIMARY_DOCTOR.fullName,
      doctorShortName: PRIMARY_DOCTOR.shortName,
      month: new Date().toISOString().slice(0, 7),
      revenueCents: paid.reduce((total, invoice) => total + invoice.amountCents, 0),
      unpaidCents: unpaid.reduce((total, invoice) => total + invoice.amountCents, 0),
      invoices: invoices.length,
      payments: {
        cashCents: paid.filter((invoice) => invoice.paymentMethod === "CASH").reduce((total, invoice) => total + invoice.amountCents, 0),
        cardCents: paid.filter((invoice) => invoice.paymentMethod === "CARD").reduce((total, invoice) => total + invoice.amountCents, 0)
      }
    };
  }

  async activity() {
    const invoices = await this.prisma.invoice.findMany({
      where: { clinicId: PRIMARY_CLINIC_ID },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`.trim(),
      amountCents: invoice.amountCents,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      paymentMethod: invoice.paymentMethod,
      createdAt: invoice.createdAt.toISOString()
    }));
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
