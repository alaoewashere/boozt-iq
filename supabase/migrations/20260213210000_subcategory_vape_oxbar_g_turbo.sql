-- Vape → Oxbar G Turbo subcategory (navbar + admin).
-- ID must match lib/supabase/catalog-ids.ts (SUBCATEGORY_IDS["oxbar-g-turbo"]).

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values (
    'b0000001-0000-4000-8000-000002000006',
    'a0000001-0000-4000-8000-000000000002',
    'oxbar-g-turbo',
    'Oxbar G Turbo',
    'أوكسبار جي تيربو',
    6
  )
on conflict (id) do nothing;
