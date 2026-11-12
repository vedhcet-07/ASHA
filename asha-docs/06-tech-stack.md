# ASHA — Tech Stack

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**Version:** v2.0  
**Status:** MVP technology stack  

## 1. Stack overview

ASHA uses a Turborepo monorepo with a React frontend and FastAPI backend.

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm |
| Frontend | React 18 + Vite + TypeScript |
| UI | Chakra UI primary, with shadcn/ui-style components where useful |
| Styling | Tailwind CSS |
| Backend | FastAPI + Python 3.11+ |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| AI | Provider-agnostic LLM adapter |
| Voice | Web Speech API first; cloud STT/TTS optional |
| Background jobs | FastAPI BackgroundTasks |
| Testing | Pytest |
| Monitoring | Sentry |
| Deployment | Vercel + Supabase |
| CI/CD | GitHub Actions |

## 2. Frontend stack

| Concern | Library | Purpose |
|---|---|---|
| Framework | React 18 | Component-based UI |
| Build tool | Vite | Fast development and production builds |
| Language | TypeScript | Type safety |
| Routing | React Router | Client-side routing |
| Server state | TanStack Query | API caching, mutations, refetching |
| Client state | Zustand | Lightweight global state |
| Forms | React Hook Form | Form state and validation |
| Schema validation | Zod | Frontend validation and shared schemas |
| UI library | Chakra UI | Primary design system, layout, theme, accessibility |
| Component patterns | shadcn/ui-style components | Product-specific composable components |
| Styling | Tailwind CSS | Utility-first styling |
| Icons | Lucide React | Consistent icon set |
| Dates | date-fns | Date formatting and calculations |
| i18n | i18next + react-i18next | English, Kannada, Hindi readiness |
| Voice | Web Speech API | Browser STT/TTS |
| PWA | vite-plugin-pwa | Installable web app |
| API client | openapi-typescript + openapi-fetch | Typed API client generated from FastAPI OpenAPI schema |

### Why this frontend stack

- Chakra UI provides accessible primitives, theming, responsive layout, and strong support for low-literacy-friendly interfaces.
- shadcn/ui-style components allow custom, product-specific patterns without adopting a heavy component library.
- TanStack Query keeps server data synchronized and simplifies live updates.
- Zustand handles small amounts of client-only state, such as active role, selected language, and UI preferences.
- Generated API types reduce frontend-backend contract drift.

## 3. Backend stack

| Concern | Library | Purpose |
|---|---|---|
| Framework | FastAPI | High-performance Python API framework |
| Language | Python 3.11+ | Modern Python features and broad AI support |
| Validation | Pydantic v2 | Request/response schemas |
| Settings | pydantic-settings | Environment configuration |
| Database access | supabase-py | Supabase database, auth, and storage access |
| Optional ORM | SQLModel or SQLAlchemy | Useful if complex queries or migrations are needed |
| Migrations | Supabase migrations / SQL files | Version-controlled schema changes |
| AI SDKs | Provider-specific SDKs behind adapter | OpenAI, Gemini, Anthropic, Groq, Ollama |
| Background work | FastAPI BackgroundTasks | Lightweight async jobs |
| Testing | Pytest + httpx | Backend unit and API tests |
| Logging | structlog | Structured logs |
| Monitoring | Sentry SDK | Error tracking |
| Security | python-jose or PyJWT | Supabase JWT validation |
| Rate limiting | slowapi | Basic API rate limits |

### Why FastAPI

- Strong support for async endpoints.
- Automatic OpenAPI documentation.
- Clean integration with Pydantic validation.
- Suitable for deterministic business rules and AI orchestration.
- Lightweight enough for a two-person hackathon team.

## 4. AI stack

ASHA supports multiple AI providers through a backend adapter.

| Provider | Library / integration | Use case |
|---|---|---|
| OpenAI | `openai` | High-quality planning, explanations, structured output |
| Google Gemini | `google-genai` | Alternative provider and future multimodal features |
| Anthropic Claude | `anthropic` | Strong reasoning and explanation |
| Groq | `groq` | Low-latency inference |
| Ollama | HTTP API / `ollama` | Local or self-hosted model option |

### Provider selection

The active provider is configured through environment variables:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
```

Supported values:

```env
AI_PROVIDER=openai
AI_PROVIDER=gemini
AI_PROVIDER=anthropic
AI_PROVIDER=groq
AI_PROVIDER=ollama
```

### AI usage boundaries

AI is used only for:

- Drafting production plans.
- Explaining allocation decisions.
- Drafting quality-review notes.
- Explaining payout calculations.
- Generating member-facing voice/text messages.

AI is not used to:

- Finalize allocation.
- Finalize cost or selling price.
- Approve payouts.
- Bypass role-based access controls.
- Make unsupervised financial decisions.

## 5. Voice stack

### MVP approach

Use browser-native Web Speech API:

- `SpeechRecognition` for leader speech input.
- `SpeechSynthesis` for member task and payout audio.

### Cloud fallback

If browser support is limited, use a provider-based service:

- Cloud STT for speech-to-text.
- Cloud TTS for text-to-speech.
- Store generated audio in Supabase Storage when needed.

### Language support

- English is the demo language.
- The i18n layer must support English, Kannada, and Hindi.
- Voice prompts use the member’s selected language.
- Voice is an enhancement, not a mandatory dependency for every action.

## 6. Supabase setup

Use one Supabase cloud project for both local development and the cloud demo environment.

### Supabase services

| Service | Use |
|---|---|
| PostgreSQL | Core business data |
| Auth | Email/password authentication and JWT |
| Storage | Photo, video, and voice proof |
| Realtime | Live updates for tasks, progress, and order status |
| Row-Level Security | Fine-grained data access control |

### Storage buckets

| Bucket | Access | Contents |
|---|---|---|
| `proof-media` | Private | Member photo, video, and voice proof |
| `buyer-media` | Private with buyer-safe signed URLs | Buyer-visible finished-goods media |

## 7. Environment variables

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENTRY_DSN=your-frontend-sentry-dsn
```

### Backend `.env`

```env
# App
APP_ENV=development
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_STORAGE_BUCKET=proof-media

# AI
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Voice
VOICE_PROVIDER=browser
CLOUD_STT_PROVIDER=
CLOUD_TTS_PROVIDER=

# Observability
SENTRY_DSN=
LOG_LEVEL=INFO
```

Never expose service-role keys, JWT secrets, or AI provider keys to the frontend.

## 8. Local development

### Prerequisites

- Node.js 20 LTS
- pnpm 9+
- Python 3.11+
- uv
- Supabase account
- Git

### Install dependencies

```bash
pnpm install
```

### Backend setup

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend setup

```bash
cd apps/web
pnpm dev
```

### Run full workspace

```bash
pnpm dev
```

### Run backend tests

```bash
cd apps/api
uv run pytest
```

### Typecheck and lint

```bash
pnpm typecheck
pnpm lint
```

## 9. Deployment

### Frontend

Deploy `apps/web` to Vercel.

- Build command: `pnpm --filter web build`
- Output directory: `apps/web/dist`
- Environment variables: Vite frontend variables only.

### Backend

Deploy `apps/api` to Vercel serverless functions if compatible.

If background jobs, long-running AI calls, or file processing require a persistent process, deploy FastAPI to a lightweight container platform instead.

Recommended MVP approach:

- Vercel for frontend.
- Vercel serverless functions for FastAPI if sufficient.
- Supabase for database, auth, storage, and realtime.
- Background jobs triggered by request events or a lightweight scheduled function.

## 10. CI/CD

GitHub Actions should run:

1. Install pnpm dependencies.
2. Lint frontend and backend.
3. Typecheck TypeScript.
4. Run backend Pytest tests.
5. Build frontend.
6. Build backend Docker image, if used.
7. Deploy preview or production only after checks pass.

## 11. Coding standards

### Frontend

- TypeScript strict mode.
- Feature-based folder structure.
- No business calculations in frontend components.
- Use TanStack Query for all server state.
- Use Chakra UI components as the default UI foundation.
- Keep text strings in i18n resource files.

### Backend

- Pydantic models for every request and response.
- Service-layer functions for business logic.
- Deterministic rule modules for allocation, costing, and payout.
- AI calls isolated behind provider adapters.
- Audit events for critical state changes.
- No secrets in source control.

## 12. Technology decision record

| Decision | Choice | Reason |
|---|---|---|
| Monorepo | Turborepo + pnpm | Shared types, configs, and simple developer workflow |
| Frontend framework | React + Vite + TypeScript | Fast, typed, mobile-first |
| UI system | Chakra UI primary | Accessible, themeable, low-literacy-friendly |
| Component patterns | shadcn/ui-style | Custom product components without heavy dependency |
| Server state | TanStack Query | Best fit for API caching and live refetching |
| Client state | Zustand | Lightweight and simple |
| API client | openapi-typescript + openapi-fetch | Type-safe contract with FastAPI |
| Backend | FastAPI | Strong Python ecosystem for rules and AI |
| Python tooling | uv | Fast, modern dependency and virtual-env management |
| Database | Supabase PostgreSQL | Managed Postgres, auth, storage, RLS |
| Supabase environment | One cloud project for dev and demo | Simplest setup for hackathon timeline |
| AI | Provider-agnostic adapter | Avoid vendor lock-in |
| Voice | Web Speech API first | No extra infrastructure for MVP |
| Realtime | Supabase Realtime | Simple live operational updates |
| Jobs | FastAPI BackgroundTasks | Sufficient for MVP |
| Testing | Pytest backend tests | Focus on business-critical rules |
| Monitoring | Sentry | Practical error tracking |
| Deployment | Vercel + Supabase | Low-cost, hackathon-friendly |
| Timezone | Store UTC, display Asia/Kolkata | Consistent storage and local display |
