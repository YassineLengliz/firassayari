# MedCabinet AI Architecture

MedCabinet AI is structured as a SaaS medical cabinet platform centered on Dr Firas Sayari, shown as `Firas .S` in operational UI.

## Workspaces

- `frontend`: Next.js, TailwindCSS, FullCalendar, Recharts dashboard.
- `backend`: NestJS API with modules for auth, appointments, patients, consultations, finance, notifications and SaaS admin.
- `database`: Prisma schema for PostgreSQL multi-clinic data.
- `ai-service`: speech-to-text and medical NLP provider boundary.
- `shared`: common doctor constants and TypeScript contracts.

## Security Model

- JWT login endpoint is scaffolded in `backend/src/auth`.
- RBAC is expressed with `@Roles(...)` and `RbacGuard`.
- Local development can pass `x-user-role: DOCTOR`, `SECRETARY` or `SAAS_ADMIN`.
- Production should replace demo credentials with hashed database users, audit logging middleware and encrypted sensitive patient fields.

## Healthcare AI Boundary

The AI layer returns structured suggestions only. Diagnosis remains a physician decision. Dictation output is cleaned and structured into motive, symptoms, hypothesis, treatment and prescription fields.

## Next Production Steps

- Add PostgreSQL migrations and seed data.
- Replace in-memory service arrays with Prisma repositories.
- Add JWT passport strategy and request user hydration.
- Add PDF generation for prescriptions and invoices.
- Add OpenAI transcription and structured output calls in `ai-service`.
- Add automated tests for appointment overlap, RBAC and invoice generation.
