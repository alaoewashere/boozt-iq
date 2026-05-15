/**
 * Create the admin user in Supabase Auth (replaces Firebase set-admin-claim).
 *
 *   npm run setup-admin
 *
 * Uses ADMIN_EMAIL from .env.local. Prompts for password via env ADMIN_PASSWORD
 * or defaults to a random password printed to console.
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

function getSupabaseForScript() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) {
    console.error("Set ADMIN_EMAIL in .env.local");
    process.exit(1);
  }

  const password =
    process.env.ADMIN_PASSWORD?.trim() ||
    randomBytes(16).toString("base64url");
  const passwordWasGenerated = !process.env.ADMIN_PASSWORD?.trim();

  const supa = getSupabaseForScript();

  const { data: existing } = await supa.auth.admin.listUsers();
  const existingUser = existing?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    const { error } = await supa.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { role: "admin" },
    });
    if (error) throw error;
    console.log(`Admin metadata updated for existing user: ${email}`);
    console.log(`User ID: ${existingUser.id}`);
    return;
  }

  const { data, error } = await supa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });

  if (error) throw error;

  console.log(`Admin user created: ${email}`);
  console.log(`User ID: ${data.user.id}`);
  if (passwordWasGenerated) {
    console.log(`Generated password: ${password}`);
    console.log(
      "Save this password! To set your own, run with ADMIN_PASSWORD=yourpassword"
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
