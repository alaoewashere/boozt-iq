import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  imageUrl: string;
  categorySlug?: string;
}

interface WishlistStore {
  items: WishlistItem[];
  /** Add if not already saved (idempotent). */
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  /** Add if missing, remove if present. */
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.some((i) => i.id === item.id)) return;
        set((s) => ({ items: [...s.items, item] }));
      },
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id);
        if (exists) {
          set((s) => ({
            items: s.items.filter((i) => i.id !== item.id),
          }));
        } else {
          set((s) => ({ items: [...s.items, item] }));
        }
      },
      has: (id) => get().items.some((i) => i.id === id),
      count: () => get().items.length,
    }),
    { name: "boozt-wishlist" }
  )
);
