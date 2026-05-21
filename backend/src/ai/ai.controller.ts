import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { RbacGuard } from "../auth/rbac.guard";
import { Roles } from "../auth/roles.decorator";
import { AiService } from "./ai.service";

class StructureDictationDto {
  @IsString()
  @MinLength(3)
  rawText!: string;
}

@Controller("ai")
@UseGuards(RbacGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("structure-dictation")
  @Roles("DOCTOR")
  structureDictation(@Body() dto: StructureDictationDto) {
    return this.ai.structureDictation(dto.rawText);
  }
}
