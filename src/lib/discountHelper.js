/**
 * Utility to calculate and check product discounts across Aura storefront
 */
export function getProductDiscountPercent(product) {
  if (!product) return 0;
  if (product.discountPercent !== undefined && product.discountPercent !== null && Number(product.discountPercent) > 0) {
    return Math.round(Number(product.discountPercent));
  }
  if (product.originalPrice && Number(product.originalPrice) > Number(product.price)) {
    const diff = Number(product.originalPrice) - Number(product.price);
    return Math.round((diff / Number(product.originalPrice)) * 100);
  }
  if (product.discountBadge) {
    const match = String(product.discountBadge).match(/(\d+)%/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * Sorts products so that:
 * 1. Items with active discounts ALWAYS have the highest priority (placed at the top).
 * 2. The 6 featured items (isFeatured === true) appear on the first list of the catalog.
 * 3. All remaining regular items follow.
 *
 * Ranking Hierarchy:
 * - Tier 1: Discounted + Featured (both on sale and atelier-featured)
 * - Tier 2: Discounted Regular (on sale)
 * - Tier 3: Featured (atelier-featured items without active discount)
 * - Tier 4: Regular (standard catalog items)
 */
export function sortProductsWithDiscountsFirst(products, customSortFn) {
  if (!Array.isArray(products)) return [];

  const discountedFeatured = [];
  const discountedRegular = [];
  const regularFeatured = [];
  const regularOther = [];

  products.forEach((p) => {
    const hasDiscount = getProductDiscountPercent(p) > 0;
    const isFeatured = Boolean(p.isFeatured);

    if (hasDiscount && isFeatured) {
      discountedFeatured.push(p);
    } else if (hasDiscount) {
      discountedRegular.push(p);
    } else if (isFeatured) {
      regularFeatured.push(p);
    } else {
      regularOther.push(p);
    }
  });

  if (customSortFn) {
    discountedFeatured.sort(customSortFn);
    discountedRegular.sort(customSortFn);
    regularFeatured.sort(customSortFn);
    regularOther.sort(customSortFn);
  }

  return [
    ...discountedFeatured,
    ...discountedRegular,
    ...regularFeatured,
    ...regularOther,
  ];
}
