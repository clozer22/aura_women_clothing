/**
 * Wishlist / Shopping Cart State & Storage Manager
 * Seamlessly manages user-isolated carts:
 * - Guests use a dedicated local guest cart (aura_guest_cart)
 * - Authenticated users store their cart directly in Supabase (public.wishlists)
 *   and keep a user-isolated local cache (aura_cart_{userId})
 * - Logging out immediately switches back to the guest cart so user items never leak
 */

import { supabase } from './supabaseClient';
import { trackAddToCart } from './metaPixel';

let currentUserId = null;
let currentItems = [];
const listeners = new Set();

let isSyncingCart = false;

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
 * Lifecycle:
 * 1. Guests store cart items in localStorage ('aura_guest_cart')
 * 2. On Login: Guest items are merged into the user account in Supabase & local cache
 * 3. De-duplication: Matching items (same product, size, color) sum quantities
 * 4. Guest cart ('aura_guest_cart') is cleared after successful merge
 * 5. On Logout: Screen cart clears to [] for privacy; Supabase account cart stays safe
 */
export async function setWishlistUser(user) {
  const newUserId = user?.id || null;
  const previousUserId = currentUserId;

  // Case A: Remaining as guest (e.g. initial page load or re-render when not logged in)
  if (!previousUserId && !newUserId) {
    if (currentItems.length === 0) {
      currentItems = loadInitialItems();
      notify(currentItems);
    }
    return;
  }

  // Case B: Same authenticated user already loaded
  if (previousUserId === newUserId && currentItems.length > 0) {
    return;
  }

  // Prevent concurrent in-flight merges for the same user transition
  if (isSyncingCart && currentUserId === newUserId) {
    return;
  }

  isSyncingCart = true;
  currentUserId = newUserId;

  try {
    if (currentUserId) {
      // ==========================================
      // SCENARIO 1: USER LOGS IN (OR CREATES ACCOUNT)
      // ==========================================

      // A. Read any pending guest cart items from device localStorage
      let guestItems = [];
      try {
        const guestRaw = localStorage.getItem('aura_guest_cart');
        if (guestRaw) {
          const parsed = JSON.parse(guestRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            guestItems = parsed;
          }
        }
      } catch (e) {
        guestItems = [];
      }

      // B. Load user's cached cart first for instant rendering
      let cachedUserItems = [];
      try {
        const cached = localStorage.getItem(`aura_cart_${currentUserId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedUserItems = parsed;
          }
        }
      } catch (e) {}

      // If we had a cached user cart and no guest items to merge, render it immediately
      if (cachedUserItems.length > 0 && guestItems.length === 0) {
        currentItems = cachedUserItems;
        notify(currentItems);
      }

      // C. Fetch the user's authoritative cart rows from Supabase
      let dbUserItems = [];
      try {
        const { data, error } = await supabase
          .from('wishlists')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          dbUserItems = data.map((row) => ({
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
        } else if (cachedUserItems.length > 0) {
          dbUserItems = cachedUserItems;
        }
      } catch (err) {
        console.warn('Could not sync user cart from Supabase:', err);
        dbUserItems = cachedUserItems;
      }

      // D. Merge Guest Cart with User Account Cart (if guest items exist)
      let finalCart = [...dbUserItems];

      if (guestItems.length > 0) {
        const itemsToInsert = [];
        const itemsToUpdate = [];

        for (const guestItem of guestItems) {
          const guestKey =
            guestItem.wishlistId ||
            `${guestItem.id}-${guestItem.size || 'Standard'}-${guestItem.color || 'Standard'}`;

          const existingIndex = finalCart.findIndex((it) => {
            const itKey =
              it.wishlistId ||
              `${it.id}-${it.size || 'Standard'}-${it.color || 'Standard'}`;
            return itKey === guestKey;
          });

          if (existingIndex > -1) {
            // DUPLICATE DETECTED: Same product, size, and color -> ADD QUANTITY!
            const existing = finalCart[existingIndex];
            const newQuantity = (existing.quantity || 1) + (guestItem.quantity || 1);

            // Respect physical inventory stock limit if known
            const maxStock =
              existing.qty !== undefined && existing.qty !== null
                ? Number(existing.qty)
                : guestItem.qty !== undefined && guestItem.qty !== null
                ? Number(guestItem.qty)
                : null;
            const cappedQuantity =
              maxStock && maxStock > 0 && newQuantity > maxStock ? maxStock : newQuantity;

            finalCart[existingIndex] = {
              ...existing,
              quantity: cappedQuantity,
              statusBadge: guestItem.statusBadge || existing.statusBadge,
              qty: maxStock !== null ? maxStock : existing.qty,
            };

            itemsToUpdate.push({
              dbId: existing.dbId,
              productId: String(existing.id),
              size: existing.size || 'Standard',
              color: existing.color || 'Standard',
              quantity: cappedQuantity,
            });
          } else {
            // NEW ITEM: Append to user's cart
            const newItem = {
              ...guestItem,
              wishlistId: guestKey,
              quantity: Number(guestItem.quantity) || 1,
            };
            finalCart.push(newItem);

            itemsToInsert.push({
              user_id: currentUserId,
              product_id: String(guestItem.id),
              product_name: guestItem.name,
              product_image: guestItem.image,
              price: Number(guestItem.price) || 0,
              size: guestItem.size || 'Standard',
              color: guestItem.color || 'Standard',
              quantity: Number(guestItem.quantity) || 1,
            });
          }
        }

        // Sync merged updates and inserts to Supabase
        try {
          if (itemsToInsert.length > 0) {
            const { data: insertedRows, error: insErr } = await supabase
              .from('wishlists')
              .upsert(itemsToInsert, { onConflict: 'user_id,product_id,size,color' })
              .select();

            if (!insErr && insertedRows) {
              insertedRows.forEach((row) => {
                const rowKey = `${row.product_id}-${row.size || 'Standard'}-${row.color || 'Standard'}`;
                const match = finalCart.find(
                  (it) => (it.wishlistId || `${it.id}-${it.size}-${it.color}`) === rowKey
                );
                if (match) match.dbId = row.id;
              });
            }
          }

          for (const upd of itemsToUpdate) {
            if (upd.dbId) {
              await supabase
                .from('wishlists')
                .update({ quantity: upd.quantity })
                .eq('id', upd.dbId)
                .eq('user_id', currentUserId);
            } else {
              await supabase
                .from('wishlists')
                .update({ quantity: upd.quantity })
                .eq('user_id', currentUserId)
                .eq('product_id', upd.productId)
                .eq('size', upd.size)
                .eq('color', upd.color);
            }
          }
        } catch (syncErr) {
          console.warn('Error syncing merged cart items to Supabase:', syncErr);
        }

        // Clear the guest cart in localStorage now that items are merged into user account
        try {
          localStorage.removeItem('aura_guest_cart');
        } catch (e) {}
      }

      // Save merged cart to the user's isolated local cache and notify listeners
      saveLocal(finalCart);
      notify(finalCart);

    } else {
      // ==========================================
      // SCENARIO 2: USER LOGS OUT
      // ==========================================
      // 1. The logged-out user's account cart remains safely stored in Supabase (and aura_cart_{userId}).
      // 2. The active screen cart on this device is immediately cleared to [] for privacy and security.
      // 3. The guest cart starts fresh as empty [].
      try {
        localStorage.setItem('aura_guest_cart', JSON.stringify([]));
      } catch (e) {}
      currentItems = [];
      notify([]);
    }
  } finally {
    isSyncingCart = false;
  }
}

export function getWishlist() {
  return currentItems || [];
}

/**
 * Add an item to the active cart (and Supabase if authenticated)
 */
export async function addToWishlist(product, selectedSize = 'Standard', selectedColor = 'Standard') {
  if (!product) return false;

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
    // Stock limit cap if applicable
    const maxStock =
      product.qty !== undefined && product.qty !== null
        ? Number(product.qty)
        : updated[existingIndex].qty;
    if (maxStock && maxStock > 0 && targetQuantity > maxStock) {
      targetQuantity = maxStock;
    }
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: targetQuantity,
      statusBadge: product.statusBadge || updated[existingIndex].statusBadge,
      qty: maxStock !== null ? maxStock : updated[existingIndex].qty,
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
      statusBadge: product.statusBadge || 'IN_STOCK',
      qty: product.qty !== undefined && product.qty !== null ? Number(product.qty) : null,
      addedAt: new Date().toISOString(),
    };
    updated = [newItem, ...currentItems];
  }

  saveLocal(updated);
  notify(updated);

  // Report conversion event to Meta Pixel
  try {
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      size: cleanSize,
      color: cleanColor,
      quantity: 1,
    });
  } catch (e) {}

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
        const { data: inserted, error: insErr } = await supabase
          .from('wishlists')
          .upsert(
            [
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
            ],
            { onConflict: 'user_id,product_id,size,color' }
          )
          .select()
          .maybeSingle();

        if (!insErr && inserted) {
          const matchIdx = updated.findIndex((it) => it.wishlistId === itemId);
          if (matchIdx > -1) {
            updated[matchIdx].dbId = inserted.id;
            saveLocal(updated);
          }
        }
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

  const updated = currentItems.filter((item) => {
    const wId = item.wishlistId || `${item.id}-${item.size || 'Standard'}-${it.color || 'Standard'}`;
    return !targetIds.has(wId);
  });

  saveLocal(updated);
  notify(updated);

  if (currentUserId) {
    try {
      for (const item of itemsToRemove) {
        let query = supabase
          .from('wishlists')
          .delete()
          .eq('user_id', currentUserId)
          .eq('product_id', String(item.id));

        if (item.size) query = query.eq('size', item.size);
        if (item.color) {
          const col =
            typeof item.color === 'object' && item.color !== null
              ? item.color.name || 'Standard'
              : item.color;
          query = query.eq('color', col);
        }
        await query;
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
