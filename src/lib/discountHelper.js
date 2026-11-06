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
 * Sorts products so that any item with an active discount is placed ON TOP of the list.
 */
export function sortProductsWithDiscountsFirst(products, customSortFn) {
  if (!Array.isArray(products)) return [];
  const discounted = [];
  const regular = [];

  products.forEach((p) => {
    if (getProductDiscountPercent(p) > 0) {
      discounted.push(p);
    } else {
      regular.push(p);
    }
  });

  if (customSortFn) {
    discounted.sort(customSortFn);
    regular.sort(customSortFn);
  }

  return [...discounted, ...regular];
}
