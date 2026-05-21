import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  platformStats() {
    return {
      clinics: 1,
      activeSubscriptions: 1,
      doctors: 1,
      monthlyRecurringRevenueCents: 49000,
      auditEvents24h: 32
    };
  }
}
