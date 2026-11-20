# ASHA – Self‑Service Micro‑Enterprise Platform

## Overview
ASHA empowers Self‑Help Groups (SHGs) to manage production workflows, allocate tasks, track progress, and approve payouts—all from a single web interface. Designed for small‑scale manufacturers and artisans, the platform provides role‑based views for leaders, members, buyers, approvers, and quality checkers.

## Live Demo
- **URL:** https://asha-shg.vercel.app/ 

## Getting Started
### Prerequisites
- **Node 18+** (pnpm 9.15.4 is pinned in `package.json`)
- **Python 3.11+** for optional API services
- **Supabase** (or any PostgreSQL instance) for production deployments

### Installation
```bash
# Clone repository
git clone https://github.com/vedhcet-07/ASHA.git && cd ASHA

# Install frontend dependencies
pnpm install --frozen-lockfile

# Build and start the frontend
pnpm dev
```
The application will be available at `http://localhost:5173`.

### Production Deployment
1. Set the required environment variables (see `.env.example`).
2. Deploy the `apps/web` package to Vercel, Netlify, or any static‑site host.
3. Deploy the FastAPI backend (`apps/api`) to a container platform (Docker, Fly.io, etc.) and configure the `API_BASE_URL` accordingly.
4. Connect a Supabase project (or compatible Postgres) and run migrations:
```bash
cd packages/database
pnpm migrate
```

## Core Features
| Role | Capabilities |
|------|---------------|
| **Leader** | View pending orders, allocate members, monitor production, approve payouts |
| **Member** | Accept tasks, submit audio/photo proof, view earnings |
| **Buyer** | Place orders, track delivery status |
| **Approver** | Review payout sheets, approve or reject payments |
| **Checker** | Perform quality inspections, request rework |

### Typical Workflow
1. **Order Creation** – Buyer creates an order with required quantity and deadline.
2. **Planning** – System suggests a production plan; leader can adjust allocations.
3. **Task Allocation** – Leader assigns members to tasks with skill‑based matching.
4. **Execution** – Members submit proof of work; checker validates quality.
5. **Costing & Payout** – Cost breakdown is generated; approver reviews and approves payouts.
6. **Delivery** – Buyer confirms receipt; order status updates to *Delivered*.

## Security & Permissions
- Role‑based access control enforced via JWT tokens.
- All sensitive keys (Supabase, API secrets) are stored server‑side and never exposed to the client.
- API endpoints validate the caller’s role before returning data.

## Documentation & Support

- **User Guide:** available in the `docs/` folder.


