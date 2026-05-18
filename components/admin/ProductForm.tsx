"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  Controller,
  type FieldErrors,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { ProductImageUpload } from "./ProductImageUpload";

const schema = z.object({
  name_en: z.string().min(1, "Product name is required."),
  description_en: z.preprocess(
    (val) => (val == null || val === "" ? "" : String(val)).trim(),
    z.string()
  ),
  description_ar: z.preprocess(
    (val) => (val == null || val === "" ? "" : String(val)).trim(),
    z.string()
  ),
  price: z.coerce
    .number({ invalid_type_error: "Price must be a number." })
    .finite("Price must be a number.")
    .positive("Price must be greater than 0."),
  discount: z
    .union([
      z.coerce
        .number({ invalid_type_error: "Discount must be a number." })
        .finite("Discount must be a number.")
        .min(0, "Discount must be between 0 and 100.")
        .max(100, "Discount must be between 0 and 100."),
      z.literal(""),
      z.undefined(),
    ])
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  stock: z.coerce
    .number({ invalid_type_error: "Stock must be a number." })
    .finite("Stock must be a number.")
    .int("Stock must be a whole number.")
    .min(0, "Stock cannot be negative."),
  categoryId: z.string().min(1, "Please select a category."),
  categorySlug: z.string().min(1),
  subcategoryId: z.string().min(1, "Please select a subcategory."),
  isAvailable: z.boolean(),
});

type ProductFormInput = z.input<typeof schema>;
type ProductFormOutput = z.output<typeof schema>;

type Cat = {
  category: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
  };
  subcategories: { id: string; slug: string; name_en: string; name_ar: string }[];
};

function submitFormDataWithProgress(
  url: string,
  method: "POST" | "PUT",
  fd: FormData,
  onProgress: (v: number | null) => void
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      } else {
        onProgress(-1);
      }
    };
    xhr.onload = () => {
      onProgress(100);
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => {
          try {
            return JSON.parse(xhr.responseText || "{}");
          } catch {
            return {};
          }
        },
      });
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export function ProductForm({
  productId,
  initial,
}: {
  productId?: string;
  initial?: Partial<ProductFormOutput> & { imageUrl?: string; imagePath?: string };
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [descLang, setDescLang] = useState<"en" | "ar">(
    locale === "ar" ? "ar" : "en"
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_en: initial?.name_en ?? "",
      description_en: initial?.description_en ?? "",
      description_ar: initial?.description_ar ?? "",
      price: initial?.price ?? 0,
      discount: initial?.discount ?? "",
      stock: initial?.stock ?? 0,
      categoryId: initial?.categoryId ?? "",
      categorySlug: initial?.categorySlug ?? "",
      subcategoryId: initial?.subcategoryId ?? "",
      isAvailable: initial?.isAvailable ?? true,
    },
  });

  const categoryId = watch("categoryId");
  const descField: "description_ar" | "description_en" =
    descLang === "ar" ? "description_ar" : "description_en";

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  useEffect(() => {
    const c = categories.find((x) => x.category.id === categoryId);
    if (c) setValue("categorySlug", c.category.slug);
  }, [categoryId, categories, setValue]);

  useEffect(() => {
    if (!file) {
      setBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const previewUrl = useMemo(() => {
    if (file && blobUrl) return blobUrl;
    if (removeExisting) return null;
    if (initial?.imageUrl) return initial.imageUrl;
    return null;
  }, [file, blobUrl, removeExisting, initial?.imageUrl]);

  const onInvalid = (errors: FieldErrors<ProductFormInput>) => {
    console.log("Validation failed:", errors);
    const labels: Record<string, string> = {
      name_en: "Product Name",
      description_en: "Description (English)",
      description_ar: "Description (Arabic)",
      price: "Price",
      discount: "Discount",
      stock: "Stock",
      categoryId: "Category",
      categorySlug: "Category",
      subcategoryId: "Subcategory",
      isAvailable: "Available for sale",
    };
    const msgs: string[] = [];
    for (const [key, err] of Object.entries(errors)) {
      const e = err as { message?: string } | undefined;
      if (e?.message) msgs.push(`${labels[key] ?? key}: ${e.message}`);
    }
    setSubmitError(
      msgs.length > 0
        ? msgs.join(" · ")
        : "Please fill in all required fields."
    );
  };

  const onSubmit: SubmitHandler<ProductFormInput> = async (input) => {
    let data: ProductFormOutput;
    try {
      data = schema.parse(input);
    } catch (e) {
      console.log("Save error:", e);
      setSubmitError("Please check all fields and try again.");
      return;
    }

    console.log("Form data:", data);
    setSubmitError(null);
    setSaveSuccess(false);

    const catRow = categories.find((x) => x.category.id === data.categoryId);
    const categorySlug = (
      catRow?.category.slug ||
      data.categorySlug ||
      ""
    ).trim();
    if (!categorySlug) {
      console.log("Save error: missing category slug for categoryId", data.categoryId);
      setSubmitError(
        "Category is invalid or still loading — wait a moment or select the category again."
      );
      return;
    }

    const priceNum = Number(data.price);
    const stockNum = Math.trunc(Number(data.stock));
    const discountNum =
      data.discount === undefined || data.discount === null
        ? 0
        : Number(data.discount);

    const formDataForLog = {
      ...data,
      categorySlug,
      price: priceNum,
      stock: stockNum,
      discount: Number.isFinite(discountNum) ? discountNum : 0,
    };
    console.log("Saving product...", {
      productId,
      collection: "products",
      formData: formDataForLog,
    });

    const fd = new FormData();
    fd.append("name_en", data.name_en.trim());
    fd.append("description_en", (data.description_en ?? "").trim());
    fd.append("description_ar", (data.description_ar ?? "").trim());
    fd.append("price", String(priceNum));
    fd.append(
      "discount",
      data.discount === undefined ? "" : String(Number(data.discount))
    );
    fd.append("stock", String(stockNum));
    fd.append("categoryId", data.categoryId);
    fd.append("categorySlug", categorySlug);
    fd.append("subcategoryId", data.subcategoryId);
    fd.append("isAvailable", data.isAvailable ? "true" : "false");

    if (productId && removeExisting && !file) {
      fd.append("clearImage", "true");
    }
    if (file) {
      fd.append("image", file);
      fd.append("filename", file.name);
    } else if (
      productId &&
      initial?.imageUrl?.trim().startsWith("https://") &&
      !removeExisting
    ) {
      // Hint for API: image is unchanged (no Storage upload). Server also skips Storage when "image" is absent.
      fd.append("unchangedImageUrl", initial.imageUrl.trim());
    }

    const url = productId ? `/api/products/${productId}` : "/api/products";
    const method = productId ? "PUT" : "POST";

    setUploadProgress(0);
    try {
      const res = await submitFormDataWithProgress(url, method, fd, (p) => {
        setUploadProgress(p);
      });
      const result = await res.json().catch(() => ({}));
      console.log("Save result:", { ok: res.ok, status: res.status, result });

      if (!res.ok) {
        const msg =
          typeof (result as { error?: string }).error === "string"
            ? (result as { error: string }).error
            : `Request failed (${res.status})`;
        setSubmitError(msg);
        return;
      }

      if (productId) {
        setSaveSuccess(true);
        router.refresh();
      } else {
        router.push("/admin/products");
        router.refresh();
      }
    } catch (error) {
      console.log("Save error:", error);
      setSubmitError("Network error");
    } finally {
      setUploadProgress(null);
    }
  };

  const subs =
    categories.find((c) => c.category.id === categoryId)?.subcategories ?? [];

  const busy = uploadProgress !== null;

  const labelClass = "text-sm font-medium text-[var(--text-secondary)]";
  const helpClass = "text-xs text-[var(--text-muted)]";
  const inputClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-card px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 disabled:opacity-60";
  const selectClass = inputClass;
  const textAreaClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-card px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 disabled:opacity-60";
  const errorClass = "mt-1 text-xs text-[var(--error)]";

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto max-w-2xl space-y-6"
      noValidate
    >
      {!productId && (
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Add New Product
          </h2>
          <p className={helpClass}>
            Fill in the details below to publish a new product.
          </p>
        </div>
      )}

      <ProductImageUpload
        previewUrl={previewUrl}
        onFileChange={(f) => {
          setFile(f);
          setRemoveExisting(false);
        }}
        onRemove={() => {
          setFile(null);
          if (initial?.imageUrl) setRemoveExisting(true);
        }}
        error={null}
        disabled={busy}
        uploadProgress={uploadProgress}
      />

      {saveSuccess && (
        <div
          className="fixed bottom-6 start-1/2 z-[100] -translate-x-1/2 rounded-xl border border-success/40 bg-success/15 px-5 py-3 text-sm font-medium text-success shadow-lg rtl:translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          {t("common.productSaved")}
        </div>
      )}

      {submitError && (
        <p className="text-sm text-[var(--error)]" role="alert">
          {submitError}
        </p>
      )}

      <div>
        <label htmlFor="name_en" className={labelClass}>
          Product Name
        </label>
        <input
          {...register("name_en")}
          id="name_en"
          placeholder="e.g. Oxbar Strawberry Lemon"
          className={inputClass}
          aria-invalid={Boolean(errors.name_en) || undefined}
          aria-describedby={errors.name_en ? "name_en_error" : undefined}
        />
        {errors.name_en && (
          <p id="name_en_error" className={errorClass} role="alert">
            {errors.name_en.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-0.5">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <p className={helpClass}>
              Optional. Write the description in{" "}
              {descLang === "ar" ? "Arabic" : "English"}.
            </p>
          </div>
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
            <button
              type="button"
              onClick={() => setDescLang("en")}
              className={
                "rounded-md px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 " +
                (descLang === "en"
                  ? "bg-card text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
              }
              aria-pressed={descLang === "en"}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setDescLang("ar")}
              className={
                "rounded-md px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 " +
                (descLang === "ar"
                  ? "bg-card text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
              }
              aria-pressed={descLang === "ar"}
            >
              Arabic
            </button>
          </div>
        </div>

        <Controller
          name={descField}
          control={control}
          render={({ field }) => (
            <textarea
              id="description"
              rows={4}
              placeholder={
                locale === "ar"
                  ? "اختياري - اكتب وصف المنتج..."
                  : "Optional - Write a description..."
              }
              className={textAreaClass}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
              aria-invalid={
                Boolean(errors.description_en) ||
                Boolean(errors.description_ar) ||
                undefined
              }
              aria-describedby={
                errors.description_en || errors.description_ar
                  ? "description_error"
                  : undefined
              }
            />
          )}
        />
        {(errors.description_en || errors.description_ar) && (
          <p id="description_error" className={errorClass} role="alert">
            {descLang === "ar"
              ? errors.description_ar?.message
              : errors.description_en?.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className={labelClass}>
            Price
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="e.g. 9.99"
            {...register("price")}
            className={inputClass}
            aria-invalid={Boolean(errors.price) || undefined}
            aria-describedby={errors.price ? "price_error" : undefined}
          />
          {errors.price && (
            <p id="price_error" className={errorClass} role="alert">
              {errors.price.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="discount" className={labelClass}>
            Discount (%)
          </label>
          <input
            id="discount"
            type="number"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 10"
            {...register("discount")}
            className={inputClass}
            aria-invalid={Boolean(errors.discount) || undefined}
            aria-describedby={errors.discount ? "discount_error" : undefined}
          />
          {errors.discount && (
            <p id="discount_error" className={errorClass} role="alert">
              {errors.discount.message as string}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="stock" className={labelClass}>
          Stock
        </label>
        <input
          id="stock"
          type="number"
          step="1"
          inputMode="numeric"
          placeholder="e.g. 50"
          {...register("stock")}
          className={inputClass}
          aria-invalid={Boolean(errors.stock) || undefined}
          aria-describedby={errors.stock ? "stock_error" : undefined}
        />
        {errors.stock && (
          <p id="stock_error" className={errorClass} role="alert">
            {errors.stock.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className={labelClass}>
            Category
          </label>
          <select
            id="categoryId"
            {...register("categoryId")}
            className={selectClass}
            aria-invalid={Boolean(errors.categoryId) || undefined}
            aria-describedby={errors.categoryId ? "category_error" : undefined}
          >
            <option value="">Select category</option>
            {categories.map(({ category }) => (
              <option key={category.id} value={category.id}>
                {locale === "ar" ? category.name_ar : category.name_en}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p id="category_error" className={errorClass} role="alert">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="subcategoryId" className={labelClass}>
            Subcategory
          </label>
          <select
            id="subcategoryId"
            {...register("subcategoryId")}
            className={selectClass}
            disabled={!categoryId}
            aria-invalid={Boolean(errors.subcategoryId) || undefined}
            aria-describedby={
              errors.subcategoryId ? "subcategory_error" : undefined
            }
          >
            <option value="">Select subcategory</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {locale === "ar" ? s.name_ar : s.name_en}
              </option>
            ))}
          </select>
          {errors.subcategoryId && (
            <p id="subcategory_error" className={errorClass} role="alert">
              {errors.subcategoryId.message}
            </p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Controller
          name="isAvailable"
          control={control}
          render={({ field }) => (
            <input
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          )}
        />
        Available for sale
      </label>
      <button
        type="submit"
        disabled={busy}
        onClick={() => console.log("Save clicked")}
        className="rounded-lg bg-accent px-6 py-2 font-medium text-[var(--text-primary)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 disabled:opacity-50"
      >
        {busy ? t("common.loading") : t("common.save")}
      </button>
    </form>
  );
}
