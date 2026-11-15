# ASHA Database

This package contains all Supabase PostgreSQL migrations, seed data, and RLS policies.

## Structure

```
database/
├── migrations/   # Ordered SQL migration files
├── seeds/        # Demo seed data SQL
└── policies/     # Row-Level Security policies
```

## Running migrations

Apply migrations through the Supabase CLI or by running them manually in the Supabase SQL editor.

```bash
# If using Supabase CLI
supabase db push
```

## Seed data

The seed file at `seeds/01-demo-seed.sql` creates:
- 1 SHG (Mahila Shakti SHG)
- 12 active members with skills and availability
- 1 buyer
- Demo user accounts

Run the seed script after applying migrations.
