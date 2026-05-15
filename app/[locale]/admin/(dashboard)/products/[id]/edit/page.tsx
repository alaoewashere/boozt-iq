import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductById } from "@/lib/server-data";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeading } from "@/components/ui/PageHeading";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("admin");
  const p = await getProductById(id);
  if (!p) notFound();
  const d = p;

  return (
    <div>
      <PageHeading size="compact" className="mb-6">
        {t("editProduct")}
      </PageHeading>
      <ProductForm
        productId={id}
        initial={{
          name_en: d.name_en as string,
          name_ar: d.name_ar as string,
          description_en: (d.description_en as string) || "",
          description_ar: (d.description_ar as string) || "",
          price: d.price as number,
          discount: (d.discount as number) || 0,
          stock: d.stock as number,
          categoryId: d.categoryId as string,
          categorySlug: d.categorySlug as string,
          subcategoryId: d.subcategoryId as string,
          isAvailable: Boolean(d.isAvailable),
          imageUrl: d.imageUrl as string,
          imagePath: d.imagePath as string,
        }}
      />
    </div>
  );
}
