-- Remove true duplicates: same name + image + price + weight (keeps lowest id).
-- Never deletes rows whose id appears in products.csv (ids 1–48).

with protected as (
  select unnest(
    array[
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
      45, 46, 47, 48
    ]::integer[]
  ) as id
),
normalized as (
  select
    id,
    trim(product_name) as norm_name,
    coalesce(nullif(trim(image), ''), '') as norm_image,
    regexp_replace(coalesce(price, ''), '[^0-9]', '', 'g') as norm_price,
    lower(trim(coalesce(weight, ''))) as norm_weight
  from public.products
),
duplicate_groups as (
  select
    norm_name,
    norm_image,
    norm_price,
    norm_weight,
    min(id) as keep_id
  from normalized
  group by norm_name, norm_image, norm_price, norm_weight
  having count(*) > 1
),
keepers as (
  select
    n.id,
    coalesce(
      (
        select min(n2.id)
        from normalized n2
        inner join protected p on p.id = n2.id
        where n2.norm_name = n.norm_name
          and n2.norm_image = n.norm_image
          and n2.norm_price = n.norm_price
          and n2.norm_weight = n.norm_weight
      ),
      g.keep_id
    ) as keep_id
  from normalized n
  inner join duplicate_groups g
    on n.norm_name = g.norm_name
    and n.norm_image = g.norm_image
    and n.norm_price = g.norm_price
    and n.norm_weight = g.norm_weight
)
delete from public.products p
using keepers k
where p.id = k.id
  and p.id <> k.keep_id
  and p.id not in (select id from protected);
