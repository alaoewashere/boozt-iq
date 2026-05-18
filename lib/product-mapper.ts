import type { ProductDoc } from "./types";
import type { ProductCardData } from "@/components/product/ProductCard";
import type { ProductDetail } from "@/components/product/ProductDetailClient";

export function toProductDetail(p: ProductDoc): ProductDetail {
  return {
    id: p.id,
    name_en: p.name_en,
    description_en: p.description_en,
    description_ar: p.description_ar,
    price: p.price,
    stock: p.stock,
    imageUrl: p.imageUrl,
    isAvailable: p.isAvailable,
    categorySlug: p.categorySlug,
  };
}

export function toProductCardData(p: ProductDoc): ProductCardData {
  return {
    id: p.id,
    name_en: p.name_en,
    price: p.price,
    stock: p.stock,
    isAvailable: p.isAvailable,
    imageUrl: p.imageUrl,
    categorySlug: p.categorySlug,
  };
}
