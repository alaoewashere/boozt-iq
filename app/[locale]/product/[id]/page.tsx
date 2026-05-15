import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getApprovedReviewsForProduct,
  getProductById,
  getRelatedProducts,
} from "@/lib/server-data";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { ProductCard } from "@/components/product/ProductCard";
import { toProductCardData, toProductDetail } from "@/lib/product-mapper";
import { Link } from "@/navigation";
import { ProductReviewsSection } from "@/components/product/ProductReviewsSection";
import { getProductDisplayName } from "@/lib/product-name";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product" };
  const title = getProductDisplayName(locale, product);
  return {
    title,
    description:
      locale === "ar"
        ? product.description_ar.slice(0, 160)
        : product.description_en.slice(0, 160),
    openGraph: {
      title,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const product = await getProductById(id);
  if (!product) notFound();

  const [related, initialReviews] = await Promise.all([
    getRelatedProducts(product.categoryId, id, 4),
    getApprovedReviewsForProduct(id),
  ]);
  const name = getProductDisplayName(locale, product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <nav className="mb-8 text-sm text-[var(--text-muted)]">
        <Link href="/" className="transition hover:text-[var(--accent)]">
          {t("nav.home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text-secondary)]">{name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductDetailClient product={toProductDetail(product)} locale={locale} />
      </div>

      <ProductReviewsSection
        productId={id}
        locale={locale}
        initialReviews={initialReviews}
      />

      {related.length > 0 && (
        <section className="mt-20 border-t border-[var(--border)] pt-14">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t("product.relatedProducts")}
          </h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={toProductCardData(p)}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
