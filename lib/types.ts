export type ProductDoc = {
  id: string;
  name_en: string;
  description_en: string;
  description_ar: string;
  price: number;
  /** Optional for older documents; defaults to 0 in mappers. */
  discount?: number;
  stock: number;
  categoryId: string;
  categorySlug: string;
  subcategoryId: string;
  imageUrl: string;
  imagePath: string;
  isAvailable: boolean;
  /** Unix ms (Supabase / serialized API) */
  createdAt: number;
  updatedAt: number;
};

export type CategoryDoc = {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  icon: string;
  order: number;
  productCount: number;
};

export type SubcategoryDoc = {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  order: number;
};

/** Home magazine category row: taxonomy + optional hero image from first matching product in scan. */
export type CategoryTreeWithCover = {
  category: CategoryDoc & { coverImageUrl: string | null };
  subcategories: SubcategoryDoc[];
};

export type OrderItem = {
  productId: string;
  name_en: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out for delivery"
  | "delivered"
  | "cancelled"
  /** @deprecated legacy */
  | "processing"
  /** @deprecated legacy */
  | "shipped";

export type OrderDoc = {
  id: string;
  customerName: string;
  customerPhone: string;
  /** Delivery area / city */
  area: string;
  /** @deprecated older orders used full address */
  customerAddress?: string;
  notes: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  /** Storage download URL for generated order PDF */
  pdfUrl?: string;
  pdfPath?: string;
  pdfGeneratedAt?: number;
};

/** Serialized for server → client props (timestamps as ms). */
export type ReviewSerialized = {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  locale: string;
  approved: boolean;
  createdAt: number;
};
