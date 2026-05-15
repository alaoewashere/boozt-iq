-- Disposable Pods → Caliburn subcategory (navbar + filters + admin).
-- ID must match lib/supabase/catalog-ids.ts (SUBCATEGORY_IDS.caliburn).

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000003000007',
    'a0000001-0000-4000-8000-000000000003',
    'caliburn',
    'Caliburn',
    'كاليبورن',
    3
  )
on conflict (id) do nothing;
