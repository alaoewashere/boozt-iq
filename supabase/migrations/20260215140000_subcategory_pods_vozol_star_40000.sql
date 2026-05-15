-- Disposable Pods → Vozol Star 40000 subcategory.
-- ID must match lib/supabase/catalog-ids.ts (SUBCATEGORY_IDS["vozol-star-40000"]).

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000003000020',
    'a0000001-0000-4000-8000-000000000003',
    'vozol-star-40000',
    'Vozol Star 40000',
    'فوزول ستار 40000',
    16
  )
on conflict (id) do nothing;
