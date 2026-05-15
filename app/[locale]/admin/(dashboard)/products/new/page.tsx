import { getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeading } from "@/components/ui/PageHeading";

export default async function NewProductPage() {
  const t = await getTranslations("admin");
  return (
    <div>
      <PageHeading size="compact" className="mb-6">
        {t("addProduct")}
      </PageHeading>
      <ProductForm />
    </div>
  );
}
