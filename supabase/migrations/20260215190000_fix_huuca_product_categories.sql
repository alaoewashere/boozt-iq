-- Ensure Huuca disposable pods map to pods / hucca (storefront infers from category + name).

update public.products
set category = 'pods / hucca'
where product_name ilike '%huuca%'
   or product_name ilike '%hucca%'
   or category ilike '%huuca%'
   or category ilike '%hucca%';
