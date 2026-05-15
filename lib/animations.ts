export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export const slideInRight = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { type: "spring" as const, damping: 25 } },
};

export const slideInLeft = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: { type: "spring" as const, damping: 25 } },
};

export const cartDrawerVariant = (isRTL: boolean) =>
  isRTL ? slideInLeft : slideInRight;
