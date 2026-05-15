-- Remove duplicate catalog rows where BOTH product_name AND image match.
-- Keeps the row with MIN(id) per (product_name, image).
-- Does NOT remove same-name rows that have different images.
--
-- Preview before running (optional, in SQL editor):
--   select product_name, image, count(*) as n, array_agg(id order by id) as ids
--   from public.products
--   group by product_name, image
--   having count(*) > 1;

delete from public.products p
where p.id > (
  select min(p2.id)
  from public.products p2
  where p2.product_name = p.product_name
    and p2.image is not distinct from p.image
);
