-- Board Games: replace Strategy / Party / Card Games / Puzzles → Cards, Dominos, Backgammon.
-- Vape: replace Devices / E-Liquids / Coils / Batteries → Nexlim, Xlime Vapes, Cartridge, Juices (keep Oxbar rows).
-- Add Cigarettes category.

-- Board Games (old subcategories)
delete from public.subcategories
where id in (
    'b0000001-0000-4000-8000-000004000001',
    'b0000001-0000-4000-8000-000004000002',
    'b0000001-0000-4000-8000-000004000003',
    'b0000001-0000-4000-8000-000004000004'
  );

-- Vape (old subcategories; Oxbar + Oxbar G Turbo remain)
delete from public.subcategories
where id in (
    'b0000001-0000-4000-8000-000002000001',
    'b0000001-0000-4000-8000-000002000002',
    'b0000001-0000-4000-8000-000002000003',
    'b0000001-0000-4000-8000-000002000004'
  );

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000004000010',
    'a0000001-0000-4000-8000-000000000004',
    'cards',
    'Cards',
    'ورق',
    1
  ),
  (
    'b0000001-0000-4000-8000-000004000011',
    'a0000001-0000-4000-8000-000000000004',
    'dominos',
    'Dominos',
    'دومينو',
    2
  ),
  (
    'b0000001-0000-4000-8000-000004000012',
    'a0000001-0000-4000-8000-000000000004',
    'backgammon',
    'Backgammon',
    'طاولة زهر',
    3
  ),
  (
    'b0000001-0000-4000-8000-000002000010',
    'a0000001-0000-4000-8000-000000000002',
    'nexlim',
    'Nexlim',
    'نيكسليم',
    1
  ),
  (
    'b0000001-0000-4000-8000-000002000011',
    'a0000001-0000-4000-8000-000000000002',
    'xlime-vapes',
    'Xlime Vapes',
    'إكسلايم فيب',
    2
  ),
  (
    'b0000001-0000-4000-8000-000002000012',
    'a0000001-0000-4000-8000-000000000002',
    'cartridge',
    'Cartridge',
    'كارتريدج',
    3
  ),
  (
    'b0000001-0000-4000-8000-000002000013',
    'a0000001-0000-4000-8000-000000000002',
    'juices',
    'Juices',
    'عصائر',
    4
  )
on conflict (id) do nothing;

update public.subcategories
set sort_order = 5
where id = 'b0000001-0000-4000-8000-000002000005';

update public.subcategories
set sort_order = 6
where id = 'b0000001-0000-4000-8000-000002000006';

insert into public.categories (id, slug, name_en, name_ar, icon, sort_order, product_count)
values
  (
    'a0000001-0000-4000-8000-000000000006',
    'cigarettes',
    'Cigarettes',
    'سجائر',
    '🚬',
    6,
    0
  )
on conflict (id) do nothing;

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000006000001',
    'a0000001-0000-4000-8000-000000000006',
    'general',
    'Cigarettes',
    'سجائر',
    1
  )
on conflict (id) do nothing;
