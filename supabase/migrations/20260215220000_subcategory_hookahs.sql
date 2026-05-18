-- Hookah → "Hookahs" subcategory (DB product category "Hookah" or "Hookahs").
-- ID must match lib/supabase/catalog-ids.ts (SUBCATEGORY_IDS.hookahs).

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values (
    'b0000001-0000-4000-8000-000001000008',
    'a0000001-0000-4000-8000-000000000001',
    'hookahs',
    'Hookahs',
    'شيشة',
    1
  )
on conflict (id) do update
set
  slug = excluded.slug,
  name_en = excluded.name_en,
  name_ar = excluded.name_ar,
  sort_order = excluded.sort_order;

update public.subcategories
set sort_order = 2
where id = 'b0000001-0000-4000-8000-000001000001';

update public.subcategories
set sort_order = 3
where id = 'b0000001-0000-4000-8000-000001000007';

update public.subcategories
set sort_order = 4
where id = 'b0000001-0000-4000-8000-000001000006';

update public.products
set category = 'hookah / hookahs'
where lower(trim(category)) in ('hookah', 'hookahs');
