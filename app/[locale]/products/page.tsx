import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getCategoriesWithSubcategories } from "@/lib/server-data";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = await getCategoriesWithSubcategories();
  const t = await getTranslations("catalog");

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1280px] px-6 py-16 text-center text-[var(--text-muted)]">
          {t("loadingResults")}
        </div>
      }
    >
      <ProductsCatalog locale={locale} categories={categories} />
    </Suspense>
  );
}
