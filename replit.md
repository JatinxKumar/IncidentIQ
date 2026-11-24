# IncidentIQ

AI-Powered Incident Detection and Root Cause Analysis Platform — detects anomalies in system telemetry using an ensemble of ML models (Decision Tree, Random Forest, KNN, SVM, K-Means), performs automated root cause analysis, and provides a natural language AI assistant for incident investigation.

## Run & Operate

- `pnpm --filter @workspace/web run dev` — run the React frontend (port auto-assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the Node.js Express API server
- `cd artifacts/ml-service && python main.py` — run the Python FastAPI ML service (port 8000)
- `pip install -r artifacts/ml-service/requirements.txt` — install Python dependencies
- `pnpm run typecheck` — full TypeScript typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to the database (dev only)
- Required env: `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend API | Node.js 24 + Express 5 + TypeScript |
| ML Engine | Python 3.11 + FastAPI + scikit-learn (added Module 4) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Validation (BE) | Zod v4 + drizzle-zod |
| Validation (ML) | Pydantic v2 + pydantic-settings |
| API Contract | OpenAPI 3.1 (lib/api-spec/openapi.yaml) |
| API Codegen | Orval → React Query hooks + Zod schemas |

## Where things live

```
artifacts/
├── web/                       ← React + Vite frontend (previewPath: "/")
│   └── src/
│       ├── features/          ← Feature modules (one folder per domain)
│       │   ├── dashboard/     ← System health overview
│       │   ├── anomalies/     ← Real-time anomaly detection + RCA
│       │   ├── incidents/     ← Incident lifecycle management
│       │   ├── models/        ← ML model management + evaluation
│       │   └── assistant/     ← Generative AI chat interface
│       ├── components/
│       │   ├── ui/            ← shadcn/ui primitives (DO NOT EDIT)
│       │   └── common/        ← IncidentIQ-specific shared components
│       ├── hooks/             ← Custom React hooks
│       ├── types/index.ts     ← ALL shared TypeScript types (single source of truth)
│       ├── lib/api.ts         ← Central API fetch wrapper
│       └── pages/             ← Route-level page components
├── api-server/                ← Node.js Express API (previewPath: "/api")
│   └── src/
│       ├── routes/            ← Express route handlers (one file per domain)
│       ├── middlewares/       ← Auth, validation, rate limiting, logging
│       └── lib/               ← Logger singleton, utilities
└── ml-service/                ← Python FastAPI ML service (internal, port 8000)
    ├── main.py                ← FastAPI app entry point
    ├── requirements.txt       ← Pinned Python dependencies
    └── app/
        ├── api/routes/        ← FastAPI route handlers
        ├── core/config.py     ← Pydantic Settings (env vars)
        ├── models/            ← ML algorithm classes (Module 4)
        ├── services/          ← Business logic (training, inference, evaluation)
        └── schemas/           ← Pydantic request/response models

lib/
├── api-spec/openapi.yaml      ← OpenAPI 3.1 spec (source of truth for all API contracts)
├── api-client-react/          ← Generated React Query hooks (auto-generated — do not edit)
├── api-zod/                   ← Generated Zod schemas (auto-generated — do not edit)
└── db/src/schema/             ← Drizzle ORM table definitions

docs/
└── SRS.md                     ← Full Software Requirements Specification (v1.0)
```

## Architecture decisions

- **Clean Architecture layers**: Presentation → Application → Domain → Infrastructure. Each layer only depends on the one below it.
- **SOLID principles**: Every class/module has one responsibility. Feature folders enforce bounded contexts.
- **OpenAPI-first**: The API contract in `lib/api-spec/openapi.yaml` is written before any implementation. Codegen produces all hooks and schemas automatically.
- **Separate ML microservice**: The Python FastAPI ML service is internal-only. The Node.js API is the orchestration layer that all frontend calls go through. This allows the ML service to be independently scaled and updated.
- **Dark mode default**: IncidentIQ targets SRE/on-call engineers. Dark mode reduces eye strain during night incidents and is the professional standard for monitoring tooling.
- **Ensemble ML**: No single algorithm wins on all telemetry patterns. Ensemble voting across Decision Tree + Random Forest + KNN + SVM gives higher accuracy and lower false-positive rate than any individual model.

## Product

IncidentIQ ingests system telemetry (metrics, logs), detects anomalies using an ensemble of 5 ML algorithms, performs root cause analysis, manages incident lifecycles (OPEN → INVESTIGATING → RESOLVED → CLOSED), and provides a natural language AI assistant for incident Q&A powered by RAG + LLM.

**ML Syllabus Coverage**: Decision Tree, Random Forest, KNN, SVM, Linear Regression, K-Means, Data Preprocessing, Feature Engineering, Supervised Learning, Model Evaluation, Precision, Recall, F1 Score, Confusion Matrix, Generative AI — 15/15 topics.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any change to `lib/api-spec/openapi.yaml`, always run codegen before touching hooks
- `artifacts/web/src/types/index.ts` is the single source of truth for ALL frontend domain types — never duplicate types in feature files
- The ML service (`artifacts/ml-service/`) is internal-only — never expose it directly on a public path
- `pnpm --filter @workspace/db run push` required after every DB schema change
- Python dependencies for scikit-learn, numpy, pandas are NOT installed yet — they are added in Module 4
- Do not edit files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` — they are auto-generated

## Pointers

- See `docs/SRS.md` for complete Software Requirements Specification
- See `lib/api-spec/openapi.yaml` for API contracts
- See `lib/db/src/schema/` for database schema
- See `.local/skills/pnpm-workspace/SKILL.md` for monorepo conventions
