import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsGateway } from "./appointments.gateway";
import { AppointmentsService } from "./appointments.service";

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsGateway],
  exports: [AppointmentsService]
})
export class AppointmentsModule {}
