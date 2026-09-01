/**
 * Wishlist / Shopping Cart State & Storage Manager
 * Seamlessly manages user-isolated carts:
 * - Guests use a dedicated local guest cart (aura_guest_cart)
 * - Authenticated users store their cart directly in Supabase (public.wishlists)
 *   and keep a user-isolated local cache (aura_cart_{userId})
 * - Logging out immediately switches back to the guest cart so user items never leak
 */

import { supabase } from './supabaseClient';

let currentUserId = null;
let currentItems = [];
const listeners = new Set();

function getStorageKey() {
  return currentUserId ? `aura_cart_${currentUserId}` : 'aura_guest_cart';
}

function loadInitialItems() {
  try {
    // Wipe legacy shared storage key
    localStorage.removeItem('aura_guest_wishlist');
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Initialize on load
currentItems = loadInitialItems();

function notify(items) {
  currentItems = items;
  listeners.forEach((listener) => {
    try {
      listener(items);
    } catch (e) {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aura_wishlist_updated', { detail: items }));
  }
}

function saveLocal(items) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(items));
  } catch (e) {}
}

/**
 * Switch the active cart context when auth state changes (login, logout)
 */
export async function setWishlistUser(user) {
  const newUserId = user?.id || null;
  if (currentUserId === newUserId && currentItems.length > 0) return;

  currentUserId = newUserId;

  if (currentUserId) {
    // 1. Read user's isolated local cache first for instant rendering
    try {
      const cached = localStorage.getItem(`aura_cart_${currentUserId}`);
      if (cached) {
        currentItems = JSON.parse(cached);
        notify(currentItems);
      }
    } catch (e) {}

    // 2. Fetch fresh cart from Supabase wishlists table
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((row) => ({
          wishlistId: `${row.product_id}-${row.size || 'Standard'}-${row.color || 'Standard'}`,
          id: row.product_id,
          name: row.product_name,
          image: row.product_image,
          price: Number(row.price) || 0,
          size: row.size || 'Standard',
          color: row.color || 'Standard',
          quantity: Number(row.quantity) || 1,
          dbId: row.id,
        }));
        saveLocal(mapped);
        notify(mapped);
      }
    } catch (err) {
      console.warn('Could not sync user cart from Supabase:', err);
    }
  } else {
    // User logged out: switch to guest cart (guest does not see logged-out user's items)
    try {
      const guestRaw = localStorage.getItem('aura_guest_cart');
      const guestItems = guestRaw ? JSON.parse(guestRaw) : [];
      saveLocal(guestItems);
      notify(guestItems);
    } catch (e) {
      notify([]);
    }
  }
}

export function getWishlist() {
  return currentItems || [];
}

/**
 * Add an item to the active cart (and Supabase if authenticated)
 */
export async function addToWishlist(product, selectedSize = 'Standard', selectedColor = 'Standard') {
  const cleanColor =
    typeof selectedColor === 'object' && selectedColor !== null
      ? selectedColor.name || 'Standard'
      : selectedColor || 'Standard';
  const cleanSize =
    typeof selectedSize === 'object' && selectedSize !== null
      ? selectedSize.name || 'Standard'
      : selectedSize || 'Standard';

  const itemId = `${product.id}-${cleanSize}-${cleanColor}`;
  const existingIndex = currentItems.findIndex((item) => item.wishlistId === itemId);

  let updated;
  let targetQuantity = 1;

  if (existingIndex > -1) {
    updated = [...currentItems];
    targetQuantity = (updated[existingIndex].quantity || 1) + 1;
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: targetQuantity,
    };
  } else {
    const newItem = {
      wishlistId: itemId,
      id: product.id,
      name: product.name,
      image: product.image,
      price: Number(product.price) || 0,
      size: cleanSize,
      color: cleanColor,
      quantity: 1,
      category: product.category || product.mainCategory || 'Clothing',
      addedAt: new Date().toISOString(),
    };
    updated = [newItem, ...currentItems];
  }

  saveLocal(updated);
  notify(updated);

  // If user is authenticated, sync with Supabase public.wishlists
  if (currentUserId) {
    try {
      if (existingIndex > -1) {
        await supabase
          .from('wishlists')
          .update({ quantity: targetQuantity })
          .eq('user_id', currentUserId)
          .eq('product_id', String(product.id))
          .eq('size', cleanSize)
          .eq('color', cleanColor);
      } else {
        await supabase.from('wishlists').insert([
          {
            user_id: currentUserId,
            product_id: String(product.id),
            product_name: product.name,
            product_image: product.image,
            price: Number(product.price) || 0,
            size: cleanSize,
            color: cleanColor,
            quantity: 1,
          },
        ]);
      }
    } catch (err) {
      console.warn('Could not insert item to Supabase wishlists:', err);
    }
  }

  return updated;
}

/**
 * Update quantity in active cart (and Supabase if authenticated)
 */
export async function updateWishlistQuantity(wishlistId, delta) {
  let targetItem = null;
  const updated = currentItems
    .map((item) => {
      if (item.wishlistId === wishlistId) {
        const newQty = (item.quantity || 1) + delta;
        if (newQty > 0) {
          const mod = { ...item, quantity: newQty };
          targetItem = mod;
          return mod;
        } else {
          targetItem = { ...item, quantity: 0 };
          return null;
        }
      }
      return item;
    })
    .filter(Boolean);

  saveLocal(updated);
  notify(updated);

  if (currentUserId && targetItem) {
    try {
      if (targetItem.quantity > 0) {
        await supabase
          .from('wishlists')
          .update({ quantity: targetItem.quantity })
          .eq('user_id', currentUserId)
          .eq('product_id', String(targetItem.id))
          .eq('size', targetItem.size)
          .eq('color', targetItem.color);
      } else {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', currentUserId)
          .eq('product_id', String(targetItem.id))
          .eq('size', targetItem.size)
          .eq('color', targetItem.color);
      }
    } catch (err) {
      console.warn('Could not update quantity in Supabase wishlists:', err);
    }
  }

  return updated;
}

/**
 * Remove an item from the active cart (and Supabase if authenticated)
 */
export async function removeFromWishlist(wishlistId) {
  const removedItem = currentItems.find(
    (item) => item.wishlistId === wishlistId || item.id === wishlistId
  );
  const updated = currentItems.filter(
    (item) => item.wishlistId !== wishlistId && item.id !== wishlistId
  );

  saveLocal(updated);
  notify(updated);

  if (currentUserId && removedItem) {
    try {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', currentUserId)
        .eq('product_id', String(removedItem.id))
        .eq('size', removedItem.size)
        .eq('color', removedItem.color);
    } catch (err) {
      console.warn('Could not remove item from Supabase wishlists:', err);
    }
  }

  return updated;
}

export function isInWishlist(productId) {
  return currentItems.some(
    (item) => item.id === productId || item.wishlistId?.startsWith(String(productId))
  );
}

/**
 * Clear the active cart
 */
export async function clearWishlist() {
  saveLocal([]);
  notify([]);

  if (currentUserId) {
    try {
      await supabase.from('wishlists').delete().eq('user_id', currentUserId);
    } catch (err) {
      console.warn('Could not clear Supabase wishlists:', err);
    }
  }
}

/**
 * Remove specific purchased items from active cart and Supabase
 */
export async function removeItemsFromWishlist(itemsToRemove = []) {
  if (!itemsToRemove || itemsToRemove.length === 0) return;

  const targetIds = new Set(
    itemsToRemove.map((it) => it.wishlistId || `${it.id}-${it.size || 'Standard'}-${it.color || 'Standard'}`)
  );
  const targetProductIds = new Set(itemsToRemove.map((it) => String(it.id)));

  const updated = currentItems.filter((item) => {
    const wId = item.wishlistId || `${item.id}-${item.size || 'Standard'}-${item.color || 'Standard'}`;
    return !targetIds.has(wId) && !targetProductIds.has(String(item.id));
  });

  saveLocal(updated);
  notify(updated);

  if (currentUserId) {
    try {
      for (const item of itemsToRemove) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', currentUserId)
          .eq('product_id', String(item.id));
      }
    } catch (err) {
      console.warn('Could not remove checked-out items from Supabase wishlists:', err);
    }
  }

  return updated;
}

export function subscribeWishlist(callback) {
  listeners.add(callback);
  callback(currentItems);
  return () => {
    listeners.delete(callback);
  };
}
