import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/verify-admin";
import {
  uploadImage,
  deleteProductImageFromCloudinary,
} from "@/lib/cloudinary";
import { serializePlainRecord } from "@/lib/serialize";
import { CACHE_TAG_PRODUCTS, getProductById } from "@/lib/server-data";
import { adminFormToProductRow } from "@/lib/supabase/product-map";

function isNewImageUpload(raw: FormDataEntryValue | null): boolean {
  if (raw == null) return false;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("https://") || t.startsWith("http://")) return false;
    return false;
  }
  return typeof Blob !== "undefined" && raw instanceof Blob && raw.size > 0;
}

/** Best-effort Cloudinary public_id from a standard secure_url. */
function tryCloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("res.cloudinary.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx < 0) return null;
    const after = parts.slice(uploadIdx + 1);
    const withoutVersion = after[0]?.startsWith("v") ? after.slice(1) : after;
    const joined = withoutVersion.join("/");
    const noExt = joined.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
    return noExt || null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = await getProductById(id);
  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id: pid, ...rest } = p;
  return NextResponse.json({
    id: pid,
    ...serializePlainRecord(rest as Record<string, unknown>),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n) || String(n) !== id.trim()) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  const { data: existing, error: exErr } = await supa
    .from("products")
    .select("image")
    .eq("id", n)
    .maybeSingle();
  if (exErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prevImageUrl = String((existing as { image?: string }).image ?? "");

  const form = await req.formData();
  const rawImage = form.get("image");
  const clearImage = form.get("clearImage") === "true";
  const hasNewFile = isNewImageUpload(rawImage);

  let imageUrl = prevImageUrl;

  if (clearImage && !hasNewFile) {
    const oldPid = tryCloudinaryPublicIdFromUrl(prevImageUrl);
    if (oldPid) await deleteProductImageFromCloudinary(oldPid);
    imageUrl = "";
  } else if (hasNewFile && rawImage instanceof Blob) {
    try {
      const buf = Buffer.from(await rawImage.arrayBuffer());
      const up = await uploadImage(buf);
      imageUrl = up.url;
      const oldPid = tryCloudinaryPublicIdFromUrl(prevImageUrl);
      if (oldPid) await deleteProductImageFromCloudinary(oldPid);
    } catch (e) {
      console.error("[products/PUT] Cloudinary upload failed:", e);
      const msg = e instanceof Error ? e.message : "Image upload failed";
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  }

  const price = Number(form.get("price"));
  const stockRaw = Number(form.get("stock"));
  const stock = Number.isFinite(stockRaw) ? Math.trunc(stockRaw) : NaN;

  const name_en = String(form.get("name_en") ?? "");
  const name_ar = String(form.get("name_ar") ?? "");
  const description_en = String(form.get("description_en") ?? "");
  const description_ar = String(form.get("description_ar") ?? "");
  const categorySlug = String(form.get("categorySlug") ?? "");
  const subcategoryId = String(form.get("subcategoryId") ?? "");
  const categoryId = String(form.get("categoryId") ?? "");

  if (!name_en.trim()) {
    return NextResponse.json(
      { error: "Product name (English) is required." },
      { status: 400 }
    );
  }
  if (!name_ar.trim()) {
    return NextResponse.json(
      { error: "Product name (Arabic) is required." },
      { status: 400 }
    );
  }
  if (!categoryId.trim()) {
    return NextResponse.json(
      { error: "Please select a category." },
      { status: 400 }
    );
  }
  if (!categorySlug.trim()) {
    return NextResponse.json(
      {
        error:
          "Category is invalid or still loading — try selecting the category again.",
      },
      { status: 400 }
    );
  }
  if (!subcategoryId.trim()) {
    return NextResponse.json(
      { error: "Please select a subcategory." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: "Price must be a positive number." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return NextResponse.json(
      { error: "Stock must be a whole number (0 or greater)." },
      { status: 400 }
    );
  }

  const { data: subRow } = await supa
    .from("subcategories")
    .select("slug")
    .eq("id", subcategoryId)
    .maybeSingle();
  const subSlug = String((subRow as { slug?: string } | null)?.slug ?? "molasses");

  const row = adminFormToProductRow({
    name_en,
    name_ar,
    description_en,
    description_ar,
    price,
    categorySlug,
    subcategorySlug: subSlug,
  });

  const { error: upErr } = await supa
    .from("products")
    .update({
      product_name: row.product_name,
      category: row.category,
      weight: row.weight,
      price: row.price,
      image: imageUrl,
    })
    .eq("id", n);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_PRODUCTS);
  revalidateTag(`product:${id}`);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n) || String(n) !== id.trim()) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  const { data: row } = await supa
    .from("products")
    .select("image")
    .eq("id", n)
    .maybeSingle();
  const img = String((row as { image?: string } | null)?.image ?? "");
  const pid = tryCloudinaryPublicIdFromUrl(img);
  if (pid) await deleteProductImageFromCloudinary(pid);

  const { error } = await supa.from("products").delete().eq("id", n);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_PRODUCTS);
  revalidateTag(`product:${id}`);
  return NextResponse.json({ success: true });
}
