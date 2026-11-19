# @asha/database

Database package for the ASHA platform. Contains migrations, seed data, and row-level security (RLS) policies.

## Structure

```
database/
├── migrations/   # Incremental schema migrations
├── seeds/        # Seed data for development & testing
└── policies/     # Row-level security (RLS) policy definitions
```

## Usage

Migrations, seeds, and policies will be managed via the database tooling configured for the project (e.g., Supabase CLI, Drizzle, or Prisma).

### Migrations

Place sequential migration files in `migrations/`. Name them with a timestamp or version prefix for ordering:

```
migrations/
  001_create_members.sql
  002_create_orders.sql
  ...
```

### Seeds

Development seed data goes in `seeds/`. These are run after migrations to populate the database with sample SHG data for local development.

### Policies

Row-level security policies are defined in `policies/`. These ensure members can only access data belonging to their own SHG.
