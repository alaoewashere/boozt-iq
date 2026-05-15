-- Remove Hookah subcategories: Pipes, Heads & Bowls, Charcoal & Foil, Accessories & Cleaning.
-- Keeps Molasses & Flavors + Hookah Parts. Reorders Hookah Parts to sort_order 2.

delete from public.subcategories
where id in (
    'b0000001-0000-4000-8000-000001000002',
    'b0000001-0000-4000-8000-000001000003',
    'b0000001-0000-4000-8000-000001000004',
    'b0000001-0000-4000-8000-000001000005'
  );

update public.subcategories
set sort_order = 2
where id = 'b0000001-0000-4000-8000-000001000006';
