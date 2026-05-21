import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { FinanceModule } from "./finance/finance.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PatientsModule } from "./patients/patients.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    PatientsModule,
    ConsultationsModule,
    FinanceModule,
    AiModule,
    NotificationsModule,
    AdminModule
  ]
})
export class AppModule {}
