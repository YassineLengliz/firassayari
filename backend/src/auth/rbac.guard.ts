import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@medcabinet/shared";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!allowedRoles?.length) return true;

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: { role?: UserRole } }>();
    const headerRole = request.headers["x-user-role"];
    const role = request.user?.role ?? (Array.isArray(headerRole) ? headerRole[0] : headerRole) ?? "DOCTOR";
    return allowedRoles.includes(role as UserRole);
  }
}
