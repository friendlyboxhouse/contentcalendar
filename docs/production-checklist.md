# Production Checklist (Hostinger Node)

## 1) Build-time environment variables

Set these variables **before** running `npm run build`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SITE_URL` (for example `https://your-domain.com`)

Using both `NEXT_PUBLIC_*` and server-side variables prevents client/runtime mismatch during first-visit hydration.

## 2) Deploy mode

Run as a Node server (`next start` or standalone output).  
Do not deploy as static export, because middleware and auth guards must execute on each request.

## 3) Required SQL migrations

Run migrations in order up to:

- `supabase/migrations/008_workspaces.sql`
- `supabase/migrations/009_workspace_ops.sql`

## 4) Initial workspace data merge (if old data exists)

If users already created data before workspace sharing:

1. Open `Settings > ทีม Workspace`
2. Choose source workspace and run **ย้ายคอนเทนต์**

Equivalent RPC:

```sql
select public.merge_workspace_content(
  '<source_workspace_uuid>'::uuid,
  '<target_workspace_uuid>'::uuid
);
```

## 5) Validate first-visit behavior

In a private/incognito browser:

1. Open `/`
2. Expect redirect to `/login`
3. Login with allowlisted email
4. Verify data visible only for active workspace
