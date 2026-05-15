import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { config as loadDotenv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

const PRODUCT_FOLDER = "boozt/products";

const CLOUDINARY_ENV_KEYS = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

/** Runtime env read — avoids Next/webpack inlining `process.env.FOO` to a stale empty value. */
function env(name: (typeof CLOUDINARY_ENV_KEYS)[number]): string {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Parse selected keys from `.env.local` without relying on `process.env` (Next may inline env at compile time).
 */
function parseEnvLocal(filePath: string): Partial<Record<string, string>> {
  if (!existsSync(filePath)) return {};
  let text = readFileSync(filePath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const want = new Set<string>(CLOUDINARY_ENV_KEYS);
  const out: Partial<Record<string, string>> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!want.has(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val.replace(/\\n/g, "\n");
  }
  return out;
}

function readCloudinaryEnv(): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} {
  let cloud_name = env("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  let api_key = env("CLOUDINARY_API_KEY");
  let api_secret = env("CLOUDINARY_API_SECRET");

  if (!cloud_name || !api_key || !api_secret) {
    const envLocal = join(process.cwd(), ".env.local");
    loadDotenv({ path: envLocal, override: true });
    cloud_name = env("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
    api_key = env("CLOUDINARY_API_KEY");
    api_secret = env("CLOUDINARY_API_SECRET");
  }

  if (!cloud_name || !api_key || !api_secret) {
    const parsed = parseEnvLocal(join(process.cwd(), ".env.local"));
    cloud_name =
      parsed.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || cloud_name;
    api_key = parsed.CLOUDINARY_API_KEY?.trim() || api_key;
    api_secret = parsed.CLOUDINARY_API_SECRET?.trim() || api_secret;
  }

  return { cloud_name, api_key, api_secret };
}

function configureCloudinary(): void {
  const { cloud_name, api_key, api_secret } = readCloudinaryEnv();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Missing Cloudinary configuration. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local"
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
}

export type CloudinaryUploadResult = {
  /** HTTPS URL, e.g. https://res.cloudinary.com/.../image/upload/... */
  url: string;
  /** Public id (used for deletes). */
  publicId: string;
};

/**
 * Upload a product image buffer to Cloudinary.
 * Returns `secure_url` and `public_id` for the products table.
 */
export async function uploadImage(buffer: Buffer): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  const result = await new Promise<{
    secure_url?: string;
    public_id: string;
  }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: PRODUCT_FOLDER,
          resource_type: "image",
          unique_filename: true,
        },
        (err, res) => {
          if (err) reject(err);
          else if (res) resolve(res);
          else reject(new Error("Cloudinary returned no result"));
        }
      );
      stream.end(buffer);
    }
  );

  const url = result.secure_url;
  if (!url || !url.startsWith("https://")) {
    throw new Error("Cloudinary did not return a valid HTTPS URL");
  }

  return {
    url,
    publicId: result.public_id,
  };
}

/**
 * Remove an image from Cloudinary when deleting a product.
 * Skips paths outside our managed folder.
 */
export async function deleteProductImageFromCloudinary(
  publicId: string
): Promise<void> {
  const id = publicId?.trim();
  if (!id) return;
  if (id.startsWith("products/") && !id.startsWith(`${PRODUCT_FOLDER}/`)) {
    return;
  }
  if (!id.startsWith(`${PRODUCT_FOLDER}/`)) {
    return;
  }
  try {
    configureCloudinary();
    await cloudinary.uploader.destroy(id, { resource_type: "image" });
  } catch (e) {
    console.error("[cloudinary] deleteProductImageFromCloudinary failed:", e);
  }
}
