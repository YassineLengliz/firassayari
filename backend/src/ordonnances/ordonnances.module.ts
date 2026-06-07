import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { OrdonnancesController } from "./ordonnances.controller";
import { OrdonnancesService } from "./ordonnances.service";

@Module({
  imports: [PrismaModule],
  controllers: [OrdonnancesController],
  providers: [OrdonnancesService]
})
export class OrdonnancesModule {}
