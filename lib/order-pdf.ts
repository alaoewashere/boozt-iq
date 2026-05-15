import "server-only";

import fs from "fs";
import path from "path";
import { getAreaLabel } from "@/lib/checkout-areas";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { convertArabic } = require(
  "arabic-persian-reshaper/ArabicShaper.js"
) as { convertArabic: (s: string) => string };

/** Latin (full coverage for EN labels, IQD, dates). */
const FONT_LATIN = "Sans";
/** Arabic script + shaping (do not use for pure English — tofu risk). */
const FONT_AR = "NotoArabic";

/** Virtual paths in pdfmake's in-memory FS */
const VFS_SANS_REG = "boozt-sans-regular.ttf";
const VFS_SANS_BOLD = "boozt-sans-bold.ttf";
const VFS_AR_REG = "boozt-sans-arabic-regular.ttf";
const VFS_AR_BOLD = "boozt-sans-arabic-bold.ttf";

const FONTS_DIR = path.join(process.cwd(), "lib", "fonts");

export type OrderPdfLineItem = {
  name_en: string;
  name_ar: string;
  quantity: number;
  price: number;
};

export type OrderPdfInput = {
  id: string;
  customerName: string;
  customerPhone: string;
  area?: string;
  customerAddress?: string;
  notes?: string;
  items: OrderPdfLineItem[];
  total: number;
  status: string;
  createdAt: Date;
};

function hasArabicScript(s: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s);
}

/**
 * Shape Arabic for PDF engines without HarfBuzz (pdfkit): presentation forms + RTL layout.
 * Latin passes through unchanged.
 */
function shapeAr(text: string): string {
  if (!text) return text;
  return convertArabic(text);
}

function loadBundledFontFiles(): {
  sansRegular: Buffer;
  sansBold: Buffer;
  arRegular: Buffer;
  arBold: Buffer;
} {
  const paths = {
    sansRegular: path.join(FONTS_DIR, "NotoSans-Regular.ttf"),
    sansBold: path.join(FONTS_DIR, "NotoSans-Bold.ttf"),
    arRegular: path.join(FONTS_DIR, "NotoSansArabic-Regular.ttf"),
    arBold: path.join(FONTS_DIR, "NotoSansArabic-Bold.ttf"),
  };
  for (const [k, p] of Object.entries(paths)) {
    if (!fs.existsSync(p)) {
      throw new Error(
        `Missing font file for ${k}: ${p}\n` +
          "Expected NotoSans-Regular/Bold and NotoSansArabic-Regular/Bold in lib/fonts/."
      );
    }
  }
  return {
    sansRegular: fs.readFileSync(paths.sansRegular),
    sansBold: fs.readFileSync(paths.sansBold),
    arRegular: fs.readFileSync(paths.arRegular),
    arBold: fs.readFileSync(paths.arBold),
  };
}

function ensurePdfMakeFonts(buffers: {
  sansRegular: Buffer;
  sansBold: Buffer;
  arRegular: Buffer;
  arBold: Buffer;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require("pdfmake") as {
    setFonts: (fonts: Record<string, Record<string, string>>) => void;
    virtualfs: { writeFileSync: (name: string, data: Buffer) => void };
  };
  pdfMake.virtualfs.writeFileSync(VFS_SANS_REG, buffers.sansRegular);
  pdfMake.virtualfs.writeFileSync(VFS_SANS_BOLD, buffers.sansBold);
  pdfMake.virtualfs.writeFileSync(VFS_AR_REG, buffers.arRegular);
  pdfMake.virtualfs.writeFileSync(VFS_AR_BOLD, buffers.arBold);

  pdfMake.setFonts({
    [FONT_LATIN]: {
      normal: VFS_SANS_REG,
      bold: VFS_SANS_BOLD,
      italics: VFS_SANS_REG,
      bolditalics: VFS_SANS_BOLD,
    },
    [FONT_AR]: {
      normal: VFS_AR_REG,
      bold: VFS_AR_BOLD,
      italics: VFS_AR_REG,
      bolditalics: VFS_AR_BOLD,
    },
  });
}

function fmtIqd(n: number): string {
  return `${new Intl.NumberFormat("en-US").format(Math.round(n))} IQD`;
}

function fmtWhen(d: Date): string {
  return d.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function loadLogoBase64(): string | null {
  try {
    const p = path.join(process.cwd(), "public", "logo.png");
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p).toString("base64");
  } catch {
    return null;
  }
}

/** Arabic table / title cell: shaped + RTL + Arabic font. */
function arCell(
  text: string,
  opts: { bold?: boolean; fontSize?: number } = {}
): Record<string, unknown> {
  const t = shapeAr(text);
  const base: Record<string, unknown> = {
    text: t,
    font: FONT_AR,
    fontSize: opts.fontSize ?? 10,
    alignment: "right" as const,
    rtl: true,
  };
  if (opts.bold) base.bold = true;
  return base;
}

/** Mixed or English fields: Latin font; Arabic lines use Arabic font. */
function mixedCell(text: string, fontSize = 10): Record<string, unknown> {
  const ar = hasArabicScript(text);
  return {
    text: ar ? shapeAr(text) : text,
    font: ar ? FONT_AR : FONT_LATIN,
    fontSize,
    alignment: (ar ? "right" : "left") as "right" | "left",
    ...(ar ? { rtl: true } : {}),
  };
}

/**
 * Build a minimal bilingual (EN + AR) order report PDF buffer.
 * Latin: Noto Sans. Arabic: Noto Sans Arabic + shaping.
 */
export async function buildOrderPdfBuffer(input: OrderPdfInput): Promise<Buffer> {
  const buffers = loadBundledFontFiles();
  ensurePdfMakeFonts(buffers);

  const areaEn = input.area
    ? getAreaLabel(input.area, "en")
    : input.customerAddress ?? "—";
  const areaAr = input.area
    ? getAreaLabel(input.area, "ar")
    : input.customerAddress ?? "—";

  const logoB64 = loadLogoBase64();
  const headerStack: object[] = [];

  if (logoB64) {
    headerStack.push({
      image: `data:image/png;base64,${logoB64}`,
      width: 56,
      alignment: "center",
      margin: [0, 0, 0, 10],
    });
  }

  headerStack.push(
    {
      text: "ORDER REPORT",
      font: FONT_LATIN,
      fontSize: 18,
      bold: true,
      color: "#1a1a18",
      alignment: "center",
      margin: [0, 0, 0, 4],
    },
    {
      text: shapeAr("تقرير الطلب"),
      font: FONT_AR,
      fontSize: 11,
      bold: true,
      alignment: "center",
      rtl: true,
      margin: [0, 0, 0, 18],
    }
  );

  const bodyRows: object[][] = [
    [
      {
        text: "Product",
        font: FONT_LATIN,
        bold: true,
        fontSize: 9,
      },
      arCell("المنتج", { bold: true, fontSize: 9 }),
      {
        text: "Qty",
        font: FONT_LATIN,
        bold: true,
        fontSize: 9,
        alignment: "center",
      },
      {
        text: "Unit",
        font: FONT_LATIN,
        bold: true,
        fontSize: 9,
        alignment: "right",
      },
      {
        text: "Line",
        font: FONT_LATIN,
        bold: true,
        fontSize: 9,
        alignment: "right",
      },
    ],
  ];

  for (const it of input.items) {
    const line = it.quantity * it.price;
    bodyRows.push([
      {
        text: it.name_en?.trim() || it.name_ar?.trim() || "—",
        font: FONT_LATIN,
        fontSize: 9,
        alignment: "left",
      },
      arCell(it.name_ar?.trim() || it.name_en?.trim() || "—", { fontSize: 9 }),
      {
        text: String(it.quantity),
        font: FONT_LATIN,
        fontSize: 9,
        alignment: "center",
      },
      {
        text: fmtIqd(it.price),
        font: FONT_LATIN,
        fontSize: 9,
        alignment: "right",
      },
      {
        text: fmtIqd(line),
        font: FONT_LATIN,
        fontSize: 9,
        alignment: "right",
      },
    ]);
  }

  const docDefinition: Record<string, unknown> = {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    defaultStyle: {
      font: FONT_LATIN,
      fontSize: 10,
      color: "#1a1a18",
    },
    styles: {
      label: {
        font: FONT_LATIN,
        fontSize: 9,
        color: "#6b6a64",
      },
      value: { font: FONT_LATIN, fontSize: 10 },
    },
    content: [
      ...headerStack,
      {
        columns: [
          { width: 120, text: "Order ID", style: "label" },
          { width: "*", text: input.id, style: "value" },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          { width: 120, text: "Date & time", style: "label" },
          { width: "*", text: fmtWhen(input.createdAt), style: "value" },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          { width: 120, text: "Status", style: "label" },
          {
            width: "*",
            ...mixedCell(input.status || "—"),
          },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          { width: 120, text: "Customer", style: "label" },
          {
            width: "*",
            ...mixedCell(input.customerName || "—"),
          },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          { width: 120, text: "Phone", style: "label" },
          {
            width: "*",
            text: input.customerPhone || "—",
            style: "value",
          },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          { width: 120, text: "Area / City", style: "label" },
          {
            width: "*",
            stack: [
              { text: areaEn, style: "value" },
              {
                text: shapeAr(areaAr),
                font: FONT_AR,
                fontSize: 10,
                alignment: "right",
                rtl: true,
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 6],
      },
      ...(input.notes?.trim()
        ? [
            {
              columns: [
                { width: 120, text: "Notes", style: "label" },
                {
                  width: "*",
                  ...mixedCell(input.notes.trim()),
                },
              ],
              margin: [0, 0, 0, 12],
            },
          ]
        : []),
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", 36, 70, 72],
          body: bodyRows,
        },
        layout: {
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? "#f3f2f0" : false,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#e8e7e3",
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 16],
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 220,
            stack: [
              {
                text: `Total: ${fmtIqd(input.total)}`,
                font: FONT_LATIN,
                alignment: "right",
                bold: true,
                fontSize: 11,
              },
            ],
          },
        ],
      },
      {
        text: `boozt.iq — Order management system — Generated ${fmtWhen(new Date())}`,
        font: FONT_LATIN,
        alignment: "center",
        fontSize: 8,
        color: "#6b6a64",
        margin: [0, 28, 0, 0],
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require("pdfmake") as {
    createPdf: (def: Record<string, unknown>) => { getBuffer: () => Promise<Buffer> };
  };
  const pdfDoc = pdfMake.createPdf(docDefinition);
  return pdfDoc.getBuffer();
}
