-- Move Vape subcategories Oxbar + Oxbar G Turbo (and their products) to Disposable Pods.
-- Subcategory IDs: lib/supabase/catalog-ids.ts (oxbar, oxbar-g-turbo)

update public.subcategories
set
  category_id = 'a0000001-0000-4000-8000-000000000003',
  sort_order = 34
where id = 'b0000001-0000-4000-8000-000002000005';

update public.subcategories
set
  category_id = 'a0000001-0000-4000-8000-000000000003',
  sort_order = 35
where id = 'b0000001-0000-4000-8000-000002000006';

-- Oxbar G Turbo products (match before generic Oxbar)
update public.products
set category = 'pods / oxbar-g-turbo'
where lower(trim(coalesce(category, ''))) in ('oxbar g turbo', 'vape / oxbar-g-turbo')
  or category = 'Oxbar G Turbo'
  or lower(trim(category)) like 'vape / oxbar-g-turbo%';

-- Oxbar products (not Pod / G Turbo / Svopp lines)
update public.products
set category = 'pods / oxbar'
where category = 'Oxbar'
   or lower(trim(coalesce(category, ''))) in ('oxbar', 'vape / oxbar')
   or (
     lower(trim(coalesce(category, ''))) like 'vape / oxbar%'
     and lower(trim(category)) not like '%g-turbo%'
     and lower(trim(category)) not like '%oxbar-g-turbo%'
   );
