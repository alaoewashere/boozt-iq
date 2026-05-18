import { readFileSync } from "fs";
import { join } from "path";

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const s = raw.replace(/^\uFEFF/, "");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cur);
      cur = "";
      const trimmed = row.map((c) => c.trim());
      if (trimmed.some(Boolean)) rows.push(trimmed);
      row = [];
      continue;
    }
    if (ch === "\r") continue;
    cur += ch;
  }
  row.push(cur);
  const trimmed = row.map((c) => c.trim());
  if (trimmed.some(Boolean)) rows.push(trimmed);
  return rows;
}

/** IDs from products.csv — always kept during catalog dedupe. */
export function loadProductsCsvIds(csvPath = join(process.cwd(), "products.csv")): Set<number> {
  const raw = readFileSync(csvPath, "utf8");
  const table = parseCsv(raw);
  const ids = new Set<number>();
  for (const r of table.slice(1)) {
    const id = parseInt(String(r[0] ?? "").trim(), 10);
    if (Number.isFinite(id)) ids.add(id);
  }
  return ids;
}
