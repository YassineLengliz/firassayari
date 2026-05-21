import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PRIMARY_DOCTOR, type UserRole } from "@medcabinet/shared";

const demoUsers = [
  { id: "doctor-firas-sayari", email: "firas@medcabinet.ai", password: "demo1234", role: "DOCTOR" as UserRole, name: PRIMARY_DOCTOR.fullName, displayName: PRIMARY_DOCTOR.shortName },
  { id: "secretary-001", email: "secretariat@medcabinet.ai", password: "demo1234", role: "SECRETARY" as UserRole, name: "Secretariat Medical", displayName: "Secretariat" },
  { id: "admin-001", email: "admin@medcabinet.ai", password: "demo1234", role: "SAAS_ADMIN" as UserRole, name: "Admin SaaS", displayName: "Admin" }
];

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  login(email: string, password: string) {
    const user = demoUsers.find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const accessToken = this.jwt.sign({ sub: user.id, role: user.role, email: user.email });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.name,
        displayName: user.displayName
      }
    };
  }
}
