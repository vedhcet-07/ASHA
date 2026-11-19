# ASHA — Voice-First Multilingual Operations Platform for SHGs

ASHA is a voice-first, multilingual operations platform designed to empower women's self-help groups (SHGs). It streamlines order management, task allocation, costing, payouts, and member coordination — all accessible via voice in local languages.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Language | TypeScript (strict) |
| Validation | Zod (shared schemas) |
| Styling | Tailwind CSS with ASHA design tokens |
| Linting | ESLint (shared config) |

## Project Structure

```
asha/
├── apps/              # Deployable applications
├── packages/
│   ├── shared-types/  # Zod schemas & TypeScript types
│   ├── ui/            # Shared UI components & design tokens
│   ├── config/        # ESLint, TypeScript, Tailwind configs
│   └── database/      # Database migrations, seeds & policies
├── turbo.json         # Turborepo task pipeline
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** 9.15.0 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)

### Setup

```bash
# Clone the repository
git clone <repo-url> asha
cd asha

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start all apps in development mode
pnpm dev
```

### Common Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run all tests |
| `pnpm clean` | Remove build artifacts |

## License

Private — All rights reserved.
