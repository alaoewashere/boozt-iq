-- Nicotine category with Velo + IQOS subcategories.
-- IDs must match lib/supabase/catalog-ids.ts.

insert into public.categories (id, slug, name_en, name_ar, icon, sort_order, product_count)
values
  (
    'a0000001-0000-4000-8000-000000000005',
    'nicotine',
    'Nicotine',
    'نيكوتين',
    '🍃',
    5,
    0
  )
on conflict (id) do nothing;

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000005000001',
    'a0000001-0000-4000-8000-000000000005',
    'velo',
    'Velo',
    'فيلو',
    1
  ),
  (
    'b0000001-0000-4000-8000-000005000002',
    'a0000001-0000-4000-8000-000000000005',
    'iqos',
    'IQOS',
    'آيكوس',
    2
  )
on conflict (id) do nothing;
