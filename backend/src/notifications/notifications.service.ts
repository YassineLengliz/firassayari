import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationsService {
  reminders() {
    return [
      { id: "notif-001", channel: "sms", target: "+216 55 100 200", status: "scheduled", message: "Rappel rendez-vous avec Dr Firas Sayari" },
      { id: "notif-002", channel: "email", target: "secretariat@medcabinet.ai", status: "sent", message: "File d'attente mise a jour" }
    ];
  }
}
