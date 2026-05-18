-- Fix Disposable Pods subcategory display name: Hucca → Huuca (slug unchanged).

update public.subcategories
set name_en = 'Huuca'
where slug = 'hucca'
  and category_id = 'a0000001-0000-4000-8000-000000000003';
