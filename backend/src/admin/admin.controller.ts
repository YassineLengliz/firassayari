import { Controller, Get, UseGuards } from "@nestjs/common";
import { RbacGuard } from "../auth/rbac.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(RbacGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("platform-stats")
  @Roles("SAAS_ADMIN")
  platformStats() {
    return this.admin.platformStats();
  }
}
