# MedCabinet AI

Patient appointment site and cabinet workspace for **Dr Firas Sayari** (`Firas .S`) with a French public booking page, a Vite admin frontend, patient management, AI-assisted consultation, dictation post-processing and finance dashboard.

## Run

```bash
npm install
npm run dev
```

Frontend: `http://localhost:3000`

Public booking page: `/`

Cabinet workspace: `/admin`

Backend:

```bash
npm run dev:backend
```

API: `http://localhost:4000/api`

Demo login:

- `firas@medcabinet.ai` / `demo1234`
- `secretariat@medcabinet.ai` / `demo1234`
- `admin@medcabinet.ai` / `demo1234`

## Key Paths

- `frontend/src/App.tsx`: Vite public booking page and `/admin` workspace.
- `backend/src`: NestJS API modules.
- `database/prisma/schema.prisma`: PostgreSQL Prisma model.
- `ai-service/src/index.ts`: provider boundary for Whisper/OpenAI medical NLP.
- `shared/src/index.ts`: shared roles, appointment contracts and doctor identity.
