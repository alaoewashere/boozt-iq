import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/verify-admin";
import { uploadImage } from "@/lib/cloudinary";
import {
  CACHE_TAG_PRODUCTS,
  getProductsApiListResponse,
} from "@/lib/server-data";
import { adminFormToProductRow } from "@/lib/supabase/product-map";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category")?.trim() || undefined;
  const subcategorySlug = searchParams.get("subcategory")?.trim() || undefined;
  const categoryIdParam = searchParams.get("categoryId") || undefined;
  const subcategoryIdParam = searchParams.get("subcategoryId") || undefined;
  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  let includeUnavailable = false;
  let maxLimit = 48;
  if (searchParams.get("admin") === "1") {
    try {
      await verifyAdmin();
      includeUnavailable = true;
      maxLimit = 2000;
    } catch {
      /* not an admin session — ignore admin flags */
    }
  }

  const rawLimit = parseInt(searchParams.get("limit") || "24", 10);
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));

  const payload = await getProductsApiListResponse({
    categorySlug,
    subcategorySlug,
    categoryIdParam,
    subcategoryIdParam,
    search,
    page,
    limit,
    includeUnavailable,
  });

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("image");
  let imageUrl = "";
  if (file instanceof Blob && file.size > 0) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const up = await uploadImage(buf);
      imageUrl = up.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image upload failed";
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  }

  const name_en = String(form.get("name_en") || "");
  const description_en = String(form.get("description_en") || "");
  const description_ar = String(form.get("description_ar") || "");
  const price = Number(form.get("price"));
  const categoryId = String(form.get("categoryId") || "");
  const categorySlug = String(form.get("categorySlug") || "");
  const subcategoryId = String(form.get("subcategoryId") || "");

  if (
    !name_en ||
    !categoryId ||
    !subcategoryId ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  const { data: subRow } = await supa
    .from("subcategories")
    .select("slug")
    .eq("id", subcategoryId)
    .maybeSingle();
  const subSlug = String((subRow as { slug?: string } | null)?.slug ?? "molasses");

  const row = adminFormToProductRow({
    name_en,
    description_en,
    description_ar,
    price,
    categorySlug,
    subcategorySlug: subSlug,
  });

  const { data: inserted, error } = await supa
    .from("products")
    .insert({
      product_name: row.product_name,
      category: row.category,
      weight: row.weight,
      price: row.price,
      image: imageUrl,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  const newId = String(inserted.id);

  revalidateTag(CACHE_TAG_PRODUCTS);
  revalidateTag(`product:${newId}`);

  return NextResponse.json({ id: newId, imageUrl, imagePath: "" });
}
