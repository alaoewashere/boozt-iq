/**
 * Load env before Supabase (used by seed / CLI scripts).
 * `npm run seed` also passes `tsx --env-file=.env.local`; this covers direct runs.
 */
import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

const root = process.cwd();
for (const name of [".env.local", ".env"]) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    config({ path: p });
  }
}
