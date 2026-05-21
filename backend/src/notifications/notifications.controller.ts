import { Controller, Get, UseGuards } from "@nestjs/common";
import { RbacGuard } from "../auth/rbac.guard";
import { Roles } from "../auth/roles.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(RbacGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("reminders")
  @Roles("DOCTOR", "SECRETARY", "SAAS_ADMIN")
  reminders() {
    return this.notifications.reminders();
  }
}
