-- Full hookahs (category "Hookah" or "Hookahs") → hookahs subcategory under main 🪔 Hookah.

update public.products
set category = 'hookah / hookahs'
where lower(trim(category)) in ('hookah', 'hookahs');
