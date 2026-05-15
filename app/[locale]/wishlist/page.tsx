import { getTranslations } from "next-intl/server";
import { WishlistView } from "@/components/wishlist/WishlistView";
import { PageHeading } from "@/components/ui/PageHeading";

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:pb-8">
      <PageHeading className="mb-8 md:mb-10">{t("wishlist.title")}</PageHeading>
      <WishlistView locale={locale} />
    </div>
  );
}
