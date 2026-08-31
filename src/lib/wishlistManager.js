/**
 * Wishlist State & Storage Manager
 * Persists guest wishlist in localStorage and notifies subscribers.
 */

const STORAGE_KEY = 'aura_guest_wishlist';
const listeners = new Set();

export function getWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function notify(items) {
  listeners.forEach((listener) => {
    try {
      listener(items);
    } catch (e) {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aura_wishlist_updated', { detail: items }));
  }
}

export function addToWishlist(product, selectedSize = 'Standard', selectedColor = 'Standard') {
  const cleanColor = typeof selectedColor === 'object' && selectedColor !== null ? selectedColor.name || 'Standard' : selectedColor || 'Standard';
  const cleanSize = typeof selectedSize === 'object' && selectedSize !== null ? selectedSize.name || 'Standard' : selectedSize || 'Standard';
  const current = getWishlist();
  const itemId = `${product.id}-${cleanSize}-${cleanColor}`;
  
  const existingIndex = current.findIndex((item) => item.wishlistId === itemId);

  let updated;
  if (existingIndex > -1) {
    // Already in wishlist, increase quantity
    updated = [...current];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: (updated[existingIndex].quantity || 1) + 1,
    };
  } else {
    const newItem = {
      wishlistId: itemId,
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price || 0,
      size: cleanSize,
      color: cleanColor,
      quantity: 1,
      category: product.category || product.mainCategory || 'Clothing',
      addedAt: new Date().toISOString(),
    };
    updated = [newItem, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  notify(updated);
  return updated;
}

export function updateWishlistQuantity(wishlistId, delta) {
  const current = getWishlist();
  const updated = current
    .map((item) => {
      if (item.wishlistId === wishlistId) {
        const newQty = (item.quantity || 1) + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    })
    .filter(Boolean);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  notify(updated);
  return updated;
}

export function removeFromWishlist(wishlistId) {
  const current = getWishlist();
  const updated = current.filter((item) => item.wishlistId !== wishlistId && item.id !== wishlistId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  notify(updated);
  return updated;
}

export function isInWishlist(productId) {
  const current = getWishlist();
  return current.some((item) => item.id === productId || item.wishlistId?.startsWith(productId));
}

export function clearWishlist() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  notify([]);
}

export function subscribeWishlist(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
