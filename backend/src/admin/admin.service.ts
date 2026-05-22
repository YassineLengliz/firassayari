import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  platformStats() {
    return {
      clinics: 0,
      activeSubscriptions: 0,
      doctors: 1,
      monthlyRecurringRevenueCents: 0,
      auditEvents24h: 0
    };
  }
}
