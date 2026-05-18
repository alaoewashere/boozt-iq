-- Products with category "Hookahs" → storefront hookah / hookahs.

update public.products
set category = 'hookah / hookahs'
where lower(trim(category)) = 'hookahs';
