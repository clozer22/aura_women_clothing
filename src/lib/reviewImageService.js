import { supabase } from './supabaseClient';

/**
 * Maximum photo proof count per product review
 */
export const MAX_REVIEW_IMAGES = 3;

/**
 * Maximum file size: 10MB
 */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Compresses an image file client-side to ensure fast uploads and low storage footprints
 */
async function compressImageFile(file, maxWidth = 1400, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file || typeof window === 'undefined' || !window.Image) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = (file.name || 'review_proof.jpg').replace(/\.[^/.]+$/, '') + '.webp';
            const compressed = new File([blob], cleanName, { type: 'image/webp' });
            resolve(compressed);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an array of review proof files to Supabase Storage ('storefront' bucket, 'reviews/' folder)
 * Returns array of public URLs
 */
export async function uploadReviewImages(files = []) {
  if (!Array.isArray(files) || files.length === 0) return [];

  const uploadedUrls = [];

  for (const item of files) {
    if (typeof item === 'string') {
      uploadedUrls.push(item);
      continue;
    }

    const file = item?.file || item;
    if (!(file instanceof File) && !(file instanceof Blob)) {
      if (item?.url && typeof item.url === 'string') {
        uploadedUrls.push(item.url);
      }
      continue;
    }

    try {
      const compressed = await compressImageFile(file);
      const cleanName = (compressed.name || 'proof.webp').replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `reviews/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('storefront')
        .upload(filePath, compressed, {
          cacheControl: '31536000',
          upsert: false,
          contentType: compressed.type || 'image/webp',
        });

      if (uploadError) {
        console.warn('[Review Upload] storefront bucket upload issue, trying chat_attachments fallback:', uploadError.message);
        const { error: fallbackError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, compressed, {
            cacheControl: '31536000',
            upsert: false,
            contentType: compressed.type || 'image/webp',
          });

        if (fallbackError) {
          throw new Error(uploadError.message || fallbackError.message);
        }

        const { data: publicData } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(filePath);

        if (publicData?.publicUrl) {
          uploadedUrls.push(publicData.publicUrl);
        }
      } else {
        const { data: publicData } = supabase.storage
          .from('storefront')
          .getPublicUrl(filePath);

        if (publicData?.publicUrl) {
          uploadedUrls.push(publicData.publicUrl);
        }
      }
    } catch (err) {
      console.error('[Review Upload Error]:', err);
      try {
        const dataUrl = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = () => res(null);
          fr.readAsDataURL(file);
        });
        if (dataUrl) uploadedUrls.push(dataUrl);
      } catch (convErr) {
        console.error('Failed to convert review proof to data URL:', convErr);
      }
    }
  }

  return uploadedUrls;
}

/**
 * Masks a reviewer's name with asterisks for anonymous reviews
 * e.g., "Adrienne Page" -> "A******e P."
 *       "Yzelle Lim" -> "Y****e L."
 *       "Maria" -> "M***a"
 *       "" -> "Anonymous"
 */
export function maskReviewerName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Anonymous';
  const trimmed = fullName.trim();
  if (!trimmed) return 'Anonymous';

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    const w = parts[0];
    if (w.length <= 2) return w[0] + '*';
    return w[0] + '*'.repeat(Math.max(2, w.length - 2)) + w[w.length - 1];
  }

  const first = parts[0];
  const last = parts[parts.length - 1];
  const maskedFirst =
    first.length <= 2
      ? first[0] + '*'
      : first[0] + '*'.repeat(Math.max(2, first.length - 2)) + first[first.length - 1];
  const lastInitial = last[0] ? `${last[0].toUpperCase()}.` : '';

  return `${maskedFirst} ${lastInitial}`.trim();
}
