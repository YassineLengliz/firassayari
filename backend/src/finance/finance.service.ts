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
        cardCents: 0
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

  async revenueSeries(range: "24h" | "7d" | "30d" | "month") {
    const config = revenueRangeConfig(range);
    const invoices = await this.prisma.invoice.findMany({
      where: { clinicId: PRIMARY_CLINIC_ID, createdAt: { gte: config.from, lt: config.to } },
      orderBy: { createdAt: "asc" }
    });

    const buckets = Array.from({ length: config.bucketCount }, (_, index) => {
      const start = new Date(config.from.getTime() + index * config.bucketMs);
      const end = new Date(Math.min(start.getTime() + config.bucketMs, config.to.getTime()));
      return {
        label: config.label(start),
        start: start.toISOString(),
        end: end.toISOString(),
        paidCents: 0,
        unpaidCents: 0,
        cashCents: 0,
        invoices: 0
      };
    });

    for (const invoice of invoices) {
      const index = Math.min(Math.floor((invoice.createdAt.getTime() - config.from.getTime()) / config.bucketMs), buckets.length - 1);
      const bucket = buckets[index];
      if (!bucket) continue;
      bucket.invoices += 1;
      if (invoice.paidAt) {
        bucket.paidCents += invoice.amountCents;
        if (invoice.paymentMethod === "CASH") bucket.cashCents += invoice.amountCents;
      } else {
        bucket.unpaidCents += invoice.amountCents;
      }
    }

    return {
      range,
      from: config.from.toISOString(),
      to: config.to.toISOString(),
      buckets
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

function revenueRangeConfig(range: "24h" | "7d" | "30d" | "month") {
  const to = new Date();
  if (range === "24h") {
    const from = new Date(to.getTime() - 24 * 60 * 60_000);
    return {
      from,
      to,
      bucketCount: 24,
      bucketMs: 60 * 60_000,
      label: (date: Date) => date.toLocaleTimeString("fr-FR", { hour: "2-digit" })
    };
  }

  if (range === "month") {
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 1));
    return {
      from,
      to: nextMonth,
      bucketCount: Math.ceil((nextMonth.getTime() - from.getTime()) / (24 * 60 * 60_000)),
      bucketMs: 24 * 60 * 60_000,
      label: (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit" })
    };
  }

  const days = range === "7d" ? 7 : 30;
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days + 1);
  from.setUTCHours(0, 0, 0, 0);
  return {
    from,
    to,
    bucketCount: days,
    bucketMs: 24 * 60 * 60_000,
    label: (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
  };
}
