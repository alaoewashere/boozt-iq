/** Curated English titles for known Arabic product names (normalized keys). */

export function normalizeProductNameKey(s: string): string {
  return s.trim().replace(/\s+/g, " ").normalize("NFC");
}

const RAW_OVERRIDES: Record<string, string> = {
  "قسجي طه": "Qasji Taha",
  "اوكسبار ميز 2 برو - فراولة كيوي رمان":
    "Oxbar Miz 2 Pro - Strawberry Kiwi Pomegranate",
  "تكة تيرا - تركواز منثول": "Teka Tera - Turquoise Menthol",
  "لوست ماري - توت ازرق منّج": "Lost Mary - Blue Mango Berry",
  "لوست ماري - توت ازرق منج": "Lost Mary - Blue Mango Berry",
  "هوكا - انكليزي": "Hookah - English",
  "هوكا - فراولة ايس كريم": "Hookah - Strawberry Ice Cream",
  "تسلا بار - فروله ليمون علج بوبي":
    "Tesla Bar - Strawberry Lemon Bubble Gum",
  "تسلا بار - فراولة ليمون علج بوبي":
    "Tesla Bar - Strawberry Lemon Bubble Gum",
  "اركيلة طه ستوره مزخرف 2": "Taha Decorative Hookah Set 2",
  "هوكا - موز بطيخ": "Hookah - Banana Watermelon",
  "مطارة قدح": "Flask Mug",
  "اوكسبار ميز 2 برو - خوخ علك": "Oxbar Miz 2 Pro - Peach Gum",
  "لوست ماري - كيوي باشن فروت جوافه":
    "Lost Mary - Kiwi Passion Fruit Guava",
  "تسلا بار - فراولة علك بوبي": "Tesla Bar - Strawberry Bubble Gum",
  "اركيلة طه ستوره مزخرف 1": "Taha Decorative Hookah Set 1",
  "فوزل ريف - زفي جيلاتو": "Vozol River - Blueberry Gelato",
};

const LOOKUP = new Map<string, string>();
for (const [ar, en] of Object.entries(RAW_OVERRIDES)) {
  LOOKUP.set(normalizeProductNameKey(ar), en);
}

export function getEnglishNameOverride(arabicName: string): string | undefined {
  return LOOKUP.get(normalizeProductNameKey(arabicName));
}
