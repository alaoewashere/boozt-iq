-- Fix mislabeled product categories so imports/admin match storefront subcategories.

update public.products
set category = 'pods / vozol'
where id in (427, 428);

update public.products
set category = 'pods / oxbar-svopp'
where category ilike '%oxbar%svoop%'
   or category ilike '%oxbar%svopp%'
   or product_name ilike '%Oxbar Svopp%'
   or product_name ilike '%Oxbar Svoop%';

update public.products
set category = 'pods / oxbar-pod'
where category ilike 'oxbar pod%'
   or (
     product_name ilike '%Oxbar Pod%'
     and product_name not ilike '%Svopp%'
     and product_name not ilike '%Svoop%'
     and product_name not ilike '%Vozol%'
   );

update public.products
set category = 'pods / vozol-gear'
where category ilike '%vozol gear%'
   or product_name ilike '%Vozol Gear Hookah%'
   or product_name ilike '%Vozol Gear Ice%';

update public.products
set category = 'pods / vozol-star-40000'
where category ilike '%vozol star%'
   or product_name ilike '%Vozol Star%';
