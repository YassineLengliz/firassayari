import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RbacGuard } from "./rbac.guard";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "dev-only-secret",
      signOptions: { expiresIn: "8h" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, RbacGuard],
  exports: [AuthService, RbacGuard]
})
export class AuthModule {}
