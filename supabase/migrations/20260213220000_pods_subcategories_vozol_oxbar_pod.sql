-- Disposable Pods: remove By Brand / By Flavor / High Nicotine / Zero Nicotine;
-- add Vozol + Oxbar Pod.

delete from public.subcategories
where id in (
    'b0000001-0000-4000-8000-000003000001',
    'b0000001-0000-4000-8000-000003000002',
    'b0000001-0000-4000-8000-000003000003',
    'b0000001-0000-4000-8000-000003000004'
  );

insert into public.subcategories (id, category_id, slug, name_en, name_ar, sort_order)
values
  (
    'b0000001-0000-4000-8000-000003000005',
    'a0000001-0000-4000-8000-000000000003',
    'vozol',
    'Vozol',
    'فوزول',
    1
  ),
  (
    'b0000001-0000-4000-8000-000003000006',
    'a0000001-0000-4000-8000-000000000003',
    'oxbar-pod',
    'Oxbar Pod',
    'أوكسبار بود',
    2
  )
on conflict (id) do nothing;
