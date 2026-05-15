-- Disposable Pods → Charlie subcategory (navbar + filters + admin).
-- ID must match lib/supabase/catalog-ids.ts (SUBCATEGORY_IDS.charlie).

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000003000008',
    'a0000001-0000-4000-8000-000000000003',
    'charlie',
    '(Charlie)',
    'تشارلي',
    4
  )
on conflict (id) do nothing;
