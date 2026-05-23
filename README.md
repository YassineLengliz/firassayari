# MedCabinet AI

Dental appointment site and cabinet workspace for **Dr Firas Sayari** (`Firas .S`) with a French public booking page, a Vite admin frontend, patient management, AI-assisted consultation, dictation post-processing and finance dashboard.

## Run

```bash
npm install
npm run dev
```

Frontend: `http://localhost:3000`

Public booking page: `/`

Cabinet workspace: `/admin`

Admin pages:

- `/admin/agenda`
- `/admin/patients`
- `/admin/consultations`
- `/admin/finance`

Backend:

```bash
npm run dev:backend
```

API: `http://localhost:4000/api`

Patients and appointments are stored through Prisma in PostgreSQL. After setting `DATABASE_URL` to the Supabase PostgreSQL connection string, apply the schema once during setup:

```bash
npm run prisma:push
```

For committed Prisma migrations, deploy them explicitly before or after a release:

```bash
npm run prisma:migrate:deploy
```

To initialize a fresh Supabase project from the SQL Editor instead, run these files in order:

1. `database/prisma/migrations/20260522222000_init/migration.sql` creates the tables, enums and indexes.
2. `database/supabase/bootstrap.sql` inserts the fixed cabinet and dentist records used by appointments. It can be run again safely.

Demo login:

- `firas@medcabinet.ai` / `demo1234`
- `secretariat@medcabinet.ai` / `demo1234`
- `admin@medcabinet.ai` / `demo1234`

## Vercel

Import this repository as one Vercel project with the project root left at the repository root. `vercel.json` builds the Vite app to `frontend/dist`, keeps SPA routes such as `/admin` on the frontend, and routes `/api/*` into one Nest-backed Vercel Function.

Set Vercel environment variables for `DATABASE_URL`, `JWT_SECRET`, and `OPENAI_API_KEY` when they are used. `DATABASE_URL` must not be blank because patient and appointment writes go to PostgreSQL. Keep `VITE_API_URL` unset or blank for Vercel so browser requests stay on the same deployment domain.

For Supabase transaction-pooler connections (port `6543`), `DATABASE_URL` should include `pgbouncer=true&connection_limit=1`; this prevents Prisma prepared-statement collisions in serverless functions. The Vercel runtime also appends these parameters when they are absent.

The Vercel build generates the Prisma client but does not run database migrations. Keeping migrations out of the build prevents deployments from waiting on a production database connection; run `npm run prisma:migrate:deploy` as a separate release operation when the schema changes.

The Vercel API entrypoint is `api/server.ts`; local development still uses the Nest backend command above.

## Key Paths

- `frontend/src/App.tsx`: Vite public booking page and `/admin` workspace.
- `backend/src`: NestJS API modules.
- `api/server.ts`: single-project Vercel API function.
- `vercel.json`: Vite output directory and one-domain frontend/API rewrites.
- `database/prisma/schema.prisma`: PostgreSQL Prisma model.
- `database/supabase/bootstrap.sql`: idempotent Supabase cabinet and dentist bootstrap records.
- `ai-service/src/index.ts`: provider boundary for Whisper/OpenAI dental clinical NLP.
- `shared/src/index.ts`: shared roles, appointment contracts and doctor identity.
