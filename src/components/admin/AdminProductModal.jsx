import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Save } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';
import LuxuryButton from '../common/LuxuryButton';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

const AdminProductModal = memo(({
  isOpen,
  editingProductId,
  newProduct,
  setNewProduct,
  isUploadingProductImage,
  onProductImageUpload,
  onSaveProduct,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-white rounded-none shadow-2xl border border-[#E8DCD7] p-6 sm:p-8 flex flex-col max-h-[90vh] md:max-h-[85vh]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#705B56] hover:text-[#2C1E1B] transition-colors p-1 z-10 cursor-pointer"
            aria-label="Close form modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 flex-shrink-0">
            <span className="font-script text-[4rem] sm:text-[4.5rem] leading-none text-[#B86B60] block -mb-1">
              {editingProductId ? 'Garment Refinement' : 'Garment Creation'}
            </span>
            <h3 className="text-xl sm:text-2xl font-editorial text-[#2C1E1B]">
              {editingProductId ? 'Edit Product Details' : 'Upload New Product'}
            </h3>
          </div>

          <form onSubmit={onSaveProduct} className="space-y-4 overflow-y-auto pr-2 flex-grow">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                  placeholder="e.g. The Monogram Silk Trench"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Category Group</label>
                <select
                  value={newProduct.mainCategory}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, mainCategory: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none cursor-pointer"
                >
                  <option value="top">Tops</option>
                  <option value="bottom">Bottoms</option>
                </select>
              </div>

              {/* Subtype */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Subtype / Section</label>
                <input
                  type="text"
                  required
                  value={newProduct.subType}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, subType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                  placeholder="e.g. Blazers & Jackets"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status Dropdown */}
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Garment Status</label>
                <select
                  value={newProduct.statusBadge}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, statusBadge: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none cursor-pointer"
                >
                  <option value="">IN STOCK (Normal)</option>
                  <option value="SOLD OUT">SOLD OUT</option>
                  <option value="PRE-ORDER">PRE-ORDER</option>
                  <option value="NEW ARRIVAL">NEW ARRIVAL</option>
                  <option value="BEST SELLER">BEST SELLER</option>
                  <option value="ARCHIVE">ARCHIVE (Hidden from Storefront)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Price */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Price (₱)</label>
                <input
                  type="number"
                  required
                  value={newProduct.price}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Quantity</label>
                <input
                  type="number"
                  required
                  value={newProduct.qty}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, qty: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                />
              </div>

              {/* Solds */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Solds</label>
                <input
                  type="number"
                  required
                  value={newProduct.solds}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, solds: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                />
              </div>
            </div>

            {/* Ratings */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Rating (e.g. 4.9)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                required
                value={newProduct.rating}
                onChange={(e) => setNewProduct(prev => ({ ...prev, rating: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
              />
            </div>

            {/* Sizes Range Input */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Available Sizes (e.g. XXS-XS, S-M, L, XL)</label>
              <input
                type="text"
                required
                value={newProduct.sizes}
                onChange={(e) => setNewProduct(prev => ({ ...prev, sizes: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                placeholder="e.g. XXS-XS, S-M, L, XL"
              />
            </div>

            {/* Product Media Upload */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                Product Media (Photo or Video - Portrait Orientation Only)
              </label>
              <input
                type="file"
                id="product-image-file"
                accept="image/*,video/*"
                onChange={onProductImageUpload}
                className="hidden"
                disabled={isUploadingProductImage}
              />

              {isUploadingProductImage ? (
                <div className="h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-t-transparent border-[#B86B60] rounded-full animate-spin" />
                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#B86B60]">Uploading to Server...</span>
                </div>
              ) : newProduct.image ? (
                <div className="flex items-center gap-4 p-3 bg-[#FAF0EC] border border-[#E8DCD7] rounded-none">
                  {isVideoUrl(newProduct.image) ? (
                    <video
                      src={newProduct.image}
                      muted
                      playsInline
                      className="w-16 h-20 object-cover border border-[#E8DCD7] bg-white flex-shrink-0"
                    />
                  ) : (
                    <img
                      src={newProduct.image}
                      alt="Product Preview"
                      className="w-16 h-20 object-cover border border-[#E8DCD7] bg-white flex-shrink-0"
                    />
                  )}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-none block w-max">
                      Media Loaded
                    </span>
                    <label
                      htmlFor="product-image-file"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E8DCD7] text-[10px] font-bold uppercase tracking-wider text-[#2C1E1B] cursor-pointer transition-colors"
                    >
                      <Upload className="w-3 h-3 text-[#B86B60]" />
                      Replace Media
                    </label>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="product-image-file"
                  className="flex flex-col items-center justify-center h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] hover:bg-[#FAF0EC]/60 transition-colors cursor-pointer text-center p-4 gap-1.5 rounded-none"
                >
                  <Upload className="w-5 h-5 text-[#B86B60]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Upload Product Media</span>
                  <span className="text-[9px] text-[#A38E88] font-medium leading-normal">
                    Supports images (PNG, JPG, WEBP) & videos (MP4, MOV, WEBM).<br />
                    <strong className="text-[#B86B60]">Must be portrait</strong> if uploading an image.
                  </span>
                </label>
              )}

              <input
                type="hidden"
                name="image"
                value={newProduct.image}
                required
              />
            </div>

            {/* Shopee Link */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Shopee Link</label>
              <input
                type="url"
                required
                value={newProduct.shopeeLink}
                onChange={(e) => setNewProduct(prev => ({ ...prev, shopeeLink: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                placeholder="e.g. https://shopee.ph/..."
              />
            </div>

            {/* Description Label */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Description Label / Heading</label>
              <input
                type="text"
                required
                value={newProduct.descriptionLabel}
                onChange={(e) => setNewProduct(prev => ({ ...prev, descriptionLabel: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                placeholder="e.g. Description, Craftsmanship, Garment Story"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Product Description</label>
              <RichTextEditor
                value={newProduct.description}
                onChange={(html) => setNewProduct(prev => ({ ...prev, description: html }))}
                placeholder="Describe material tailoring details..."
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8DCD7] mt-6">
              <LuxuryButton
                variant="outline"
                type="button"
                onClick={onClose}
              >
                Cancel
              </LuxuryButton>
              <LuxuryButton
                variant="primary"
                type="submit"
                icon={Save}
              >
                Save Garment
              </LuxuryButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

AdminProductModal.displayName = 'AdminProductModal';

export default AdminProductModal;
