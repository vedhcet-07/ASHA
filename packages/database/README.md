# packages/database

This package owns all database migrations and seed data for the ASHA platform.
Migrations are written as plain SQL and applied via the Supabase CLI.

---

## Directory layout

```
packages/database/
├── migrations/     SQL migration files, numbered and timestamped
├── seeds/          Deterministic seed scripts for development and demos
└── README.md       This file
```

---

## Migration workflow

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 1.100  
- A local Docker Desktop instance **or** a Supabase project URL + service-role key in your `.env`

### Local development (recommended for new migrations)

1. **Start the local Supabase stack**

   ```bash
   supabase start
   ```

   This spins up a local Postgres instance, the Supabase Studio UI, and all supporting services.

2. **Create a new migration**

   ```bash
   supabase migration new <descriptive_name>
   ```

   This writes an empty `.sql` file into `supabase/migrations/` with a timestamp prefix, e.g. `20240601120000_descriptive_name.sql`.
   Copy the file to `packages/database/migrations/` once it is ready.

3. **Apply pending migrations to the local database**

   ```bash
   supabase db reset
   ```

   `db reset` drops and recreates the local database, applies all migrations in order, then runs the seed file if one exists at `supabase/seed.sql`.

4. **Apply migrations to a remote Supabase project**

   ```bash
   supabase db push
   ```

   Applies all unapplied migrations to the linked remote project.  
   Requires `supabase link --project-ref <project_ref>` to have been run first.

### Naming convention

Migration files follow the pattern:

```
NNN_short_description.sql
```

Where `NNN` is a zero-padded sequence number, e.g.:

```
001_initial_schema.sql
002_add_rls_policies.sql
003_add_audit_events_index.sql
```

Always keep migrations **additive** — never drop columns or tables in a migration that could affect production. Use a separate deprecation migration when removal is safe.

---

## Seed workflow

Seed scripts in `seeds/` are deterministic — running them twice produces the same state (idempotent). They use `INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE` to avoid duplicate key errors.

### Apply seeds locally

```bash
supabase db reset
# seeds are picked up automatically if placed at supabase/seed.sql
# or run a specific seed manually:
psql "$DATABASE_URL" -f packages/database/seeds/001_demo_shg.sql
```

### Seed file naming

```
NNN_description.sql
```

e.g. `001_demo_shg.sql`, `002_demo_orders.sql`.

---

## Useful Supabase CLI commands

| Command | Purpose |
|---|---|
| `supabase start` | Start local stack |
| `supabase stop` | Stop local stack |
| `supabase db reset` | Reset local DB and re-apply all migrations + seeds |
| `supabase db push` | Apply unapplied migrations to the linked remote project |
| `supabase db pull` | Pull remote schema changes into a new local migration |
| `supabase migration list` | Show applied vs. pending migrations |
| `supabase status` | Show local service URLs and connection strings |

---

## Row-Level Security

Every user-facing table has RLS enabled. Policies live in a dedicated migration file (`migrations/002_rls_policies.sql`) so they can be reviewed separately from the schema.

Supabase's service-role key bypasses RLS — the FastAPI backend always uses the service-role key so it can read across SHGs for admin and reporting operations. The anon key (used by the frontend) is subject to RLS.

---

## Tips

- **Never commit secrets.** The `.env` file holding `SUPABASE_SERVICE_ROLE_KEY` is git-ignored.
- **Test migrations locally** with `supabase db reset` before pushing to staging or production.
- **Use transactions** in migration files (`BEGIN; ... COMMIT;`) so a failed migration leaves no partial state.
