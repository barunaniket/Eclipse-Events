# Tero: Eclipse Events
> Generated April 22, 2026 by [Tero](https://tero.run)

## What changed

- `supabase/migrations/20260320_multi_event_system.sql`
- `lib/events.ts`
- `app/api/admin/events/route.ts`
- `app/api/admin/events/[id]/route.ts`
- `components/events/EventCard.tsx`
- `components/events/EventManager.tsx`
- `components/events/EventsPanel.tsx`
- `app/admin/dashboard/page.tsx`
- `supabase/migrations/20260319_events_table.sql`

## Deploy checklist

> Run these commands AFTER merging this PR

### Step 1: Run database migrations

```bash
supabase db push
```

Migration files:
- `supabase/migrations/`

## Verify after deploying

- [ ] App loads without errors
- [ ] Database migration completed
- [ ] No data loss or schema errors
- [ ] Preview URL works as expected

## Rollback

```bash
# Revert this PR's changes:
git revert HEAD

# Revert database migration:
# Check supabase/migrations/ for the down migration
```

---

*Shipped by [Tero](https://tero.run) · [View blueprint](https://app.tero.run/blueprints/e46463f7-7860-4d39-90c5-376463a8577d)*