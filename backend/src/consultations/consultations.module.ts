import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ConsultationsController } from "./consultations.controller";
import { ConsultationsService } from "./consultations.service";

@Module({
  imports: [AiModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService]
})
export class ConsultationsModule {}
