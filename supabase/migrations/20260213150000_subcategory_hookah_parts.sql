-- Hookah → "Hookah Parts" subcategory (navbar + admin).
-- ID must match lib/supabase/catalog-ids.ts (SUBCATEGORY_IDS.parts).

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values (
    'b0000001-0000-4000-8000-000001000006',
    'a0000001-0000-4000-8000-000000000001',
    'parts',
    'Hookah Parts',
    'قطع الشيشة',
    2
  )
on conflict (id) do nothing;
