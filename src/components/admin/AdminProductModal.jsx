import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Save, Layers, Package, Plus, Trash2, Copy, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';
import LuxuryButton from '../common/LuxuryButton';

const isVideoUrl = (url) => url && (url.startsWith('data:video/') || url.match(/\.(mp4|mov|webm)($|\?)/i));

const getHexForColorName = (name) => {
  if (!name) return '#E6D7CD';
  const n = name.toLowerCase();
  if (n.includes('pink') || n.includes('blush')) return '#F3C5C5';
  if (n.includes('rose')) return '#D99B91';
  if (n.includes('beige') || n.includes('oatmeal') || n.includes('vanilla')) return '#E6D7CD';
  if (n.includes('espresso') || n.includes('chocolate') || n.includes('coffee')) return '#362420';
  if (n.includes('gray') || n.includes('grey')) return '#6B7280';
  if (n.includes('white') || n.includes('chalk')) return '#FFFFFF';
  if (n.includes('black') || n.includes('noir') || n.includes('onyx')) return '#111827';
  if (n.includes('cream')) return '#F9F6F0';
  if (n.includes('gold')) return '#E5D3B3';
  if (n.includes('taupe')) return '#D99B91';
  if (n.includes('sandstone')) return '#DED3C9';
  if (n.includes('ivory')) return '#FAF5F2';
  if (n.includes('mocha')) return '#A8928B';
  if (n.includes('plum') || n.includes('berry') || n.includes('burgundy')) return '#581845';
  if (n.includes('blue') || n.includes('navy') || n.includes('denim')) return '#1B3B6F';
  if (n.includes('green') || n.includes('sage') || n.includes('olive')) return '#8F9779';
  return '#E6D7CD';
};

const TOPS_DEFAULT_DESC = `<p>A timeless essential designed for effortless elegance. Crafted from premium breathable fabric that drapes comfortably for everyday wear.</p><br>Details<br>• Designed for effortless everyday styling<br>• Soft, comfortable and breathable fabric<br>• High-quality atelier tailoring<br>• Available in XXS–XL<br><br>Care<br>Machine wash on a gentle cycle with cold water. Avoid harsh bleach to preserve fabric quality.`;

const BOTTOMS_DEFAULT_DESC = `<p>A feminine take on effortless versatility. Features a flattering high-comfort silhouette tailored for everyday movement and elegant style.</p><br>Details<br>• Flattering silhouette and comfortable waist fit<br>• Designed for movement and all-day comfort<br>• Versatile for casual or elevated looks<br>• Available in XXS–XL<br><br>Care<br>Machine wash on a gentle cycle with cold water. Avoid harsh bleach to preserve fabric quality.`;

const AdminProductModal = memo(({
  isOpen,
  initialMode = 'single',
  editingProductId,
  newProduct,
  setNewProduct,
  isUploadingProductImage,
  onProductImageUpload,
  onSaveProduct,
  onBulkSaveProducts,
  onUploadVariantImage,
  onClose,
}) => {
  const [createMode, setCreateMode] = useState(initialMode || 'single');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // Bulk Shared State (filled one-time only for all variants)
  const [bulkShared, setBulkShared] = useState({
    baseName: '',
    mainCategory: 'top',
    subType: '',
    defaultPrice: '',
    defaultQty: '50',
    discountPercent: '',
    sizes: 'XXS-XS, S-M, L, XL',
    statusBadge: '',
    shopeeLink: 'https://shopee.ph',
    descriptionLabel: 'Description',
    description: TOPS_DEFAULT_DESC,
  });

  // Bulk Color Variants State (only fields needed: color, image, stock, price)
  const [variants, setVariants] = useState([
    { id: 'var-1', color: '', price: '', qty: '50', image: '', isUploading: false },
    { id: 'var-2', color: '', price: '', qty: '50', image: '', isUploading: false },
  ]);

  // Sync mode with prop changes when modal opens
  useEffect(() => {
    if (editingProductId) {
      setCreateMode('single');
    } else if (initialMode) {
      setCreateMode(initialMode);
    }
  }, [initialMode, editingProductId, isOpen]);

  if (!isOpen) return null;

  // Handle switching category in bulk mode
  const handleBulkCategoryChange = (newCat) => {
    const currentIsDefault =
      bulkShared.description === TOPS_DEFAULT_DESC ||
      bulkShared.description === BOTTOMS_DEFAULT_DESC ||
      !bulkShared.description;

    setBulkShared((prev) => ({
      ...prev,
      mainCategory: newCat,
      description: currentIsDefault
        ? newCat === 'top'
          ? TOPS_DEFAULT_DESC
          : BOTTOMS_DEFAULT_DESC
        : prev.description,
    }));
  };

  // Add another variant row
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        color: '',
        price: bulkShared.defaultPrice || '',
        qty: bulkShared.defaultQty || '50',
        image: '',
        isUploading: false,
      },
    ]);
  };

  // Duplicate an existing variant row
  const handleDuplicateVariant = (index) => {
    const source = variants[index];
    if (!source) return;
    const duplicated = {
      ...source,
      id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      color: source.color ? `${source.color} (Copy)` : '',
    };
    setVariants((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
  };

  // Remove a variant row
  const handleRemoveVariant = (id) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // Update variant row field
  const handleVariantChange = (id, field, value) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Handle image upload for a specific variant row
  const handleRowImageUpload = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isUploading: true } : v))
    );
    setBulkError('');

    try {
      if (onUploadVariantImage) {
        const publicUrl = await onUploadVariantImage(file);
        setVariants((prev) =>
          prev.map((v) => (v.id === id ? { ...v, image: publicUrl } : v))
        );
      }
    } catch (err) {
      setBulkError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setVariants((prev) =>
        prev.map((v) => (v.id === id ? { ...v, isUploading: false } : v))
      );
    }
  };

  // Submit bulk creation
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkError('');

    if (!bulkShared.baseName.trim()) {
      setBulkError('Please enter a Base Product Name.');
      return;
    }
    if (!bulkShared.subType.trim()) {
      setBulkError('Please enter a Subtype (e.g. Corset, Skirt, Amelia).');
      return;
    }

    const defaultPriceNum = Number(bulkShared.defaultPrice) || 0;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.color.trim()) {
        setBulkError(`Variant #${i + 1} is missing a Color name.`);
        return;
      }
      const itemPrice = Number(v.price) || defaultPriceNum;
      if (itemPrice <= 0) {
        setBulkError(`Variant #${i + 1} (${v.color}) must have a valid price greater than 0.`);
        return;
      }
      if (!v.image) {
        setBulkError(`Variant #${i + 1} (${v.color}) is missing an image. Please upload a portrait photo.`);
        return;
      }
    }

    setIsSubmittingBulk(true);
    try {
      const baseName = bulkShared.baseName.trim();
      const discountPct = Math.max(0, Math.min(90, Number(bulkShared.discountPercent) || 0));

      const batchProducts = variants.map((v, idx) => {
        const itemPrice = Number(v.price) || defaultPriceNum;
        const sellingPrice = discountPct > 0 ? Math.round(itemPrice * (1 - discountPct / 100)) : itemPrice;
        const origPrice = discountPct > 0 ? itemPrice : null;
        const badge = discountPct > 0 ? `${discountPct}% OFF` : null;

        const trimmedColor = v.color.trim();
        let fullName = baseName;
        if (!fullName.toLowerCase().includes(trimmedColor.toLowerCase())) {
          fullName = `${fullName} in ${trimmedColor}`;
        }

        return {
          id: `aura-custom-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: fullName,
          subtitle: 'Atelier Runway Collection',
          category: bulkShared.mainCategory === 'top' ? 'Tops' : 'Bottoms',
          mainCategory: bulkShared.mainCategory,
          subType: bulkShared.subType.trim(),
          price: sellingPrice,
          originalPrice: origPrice,
          discountPercent: discountPct,
          discountBadge: badge,
          qty: Number(v.qty) || 0,
          colors: [{ name: trimmedColor, hex: getHexForColorName(trimmedColor) }],
          sizes: bulkShared.sizes || 'XXS-XS, S-M, L, XL',
          image: v.image,
          hoverImage: v.image,
          sizeChart: null,
          descriptionLabel: bulkShared.descriptionLabel || 'Description',
          description: bulkShared.description || (bulkShared.mainCategory === 'top' ? TOPS_DEFAULT_DESC : BOTTOMS_DEFAULT_DESC),
          shopeeLink: bulkShared.shopeeLink || 'https://shopee.ph',
          rating: 5.0,
          solds: 0,
          reviewsCount: 0,
          isNew: true,
          isFeatured: false,
          statusBadge: bulkShared.statusBadge || null,
          createdAt: new Date().toISOString(),
        };
      });

      if (onBulkSaveProducts) {
        await onBulkSaveProducts(batchProducts);
      }
    } catch (err) {
      setBulkError(err.message || 'Bulk creation failed.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
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
          className={`relative z-10 w-full ${
            createMode === 'bulk' && !editingProductId
              ? 'max-w-4xl'
              : 'max-w-lg'
          } bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-7 flex flex-col max-h-[92vh] transition-all duration-300`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 z-10 cursor-pointer rounded-lg hover:bg-slate-100"
            aria-label="Close form modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="mb-4 flex-shrink-0 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60 inline-flex items-center gap-1">
                {editingProductId ? (
                  'Product Editor'
                ) : createMode === 'bulk' ? (
                  <>
                    <Layers className="w-3 h-3 text-indigo-600" />
                    <span>Bulk Variant Creator</span>
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3" />
                    <span>Single Garment</span>
                  </>
                )}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-sans text-slate-900">
              {editingProductId
                ? 'Edit Product Details'
                : createMode === 'bulk'
                ? 'Bulk Create Color Variants'
                : 'Add New Product'}
            </h3>
            {createMode === 'bulk' && !editingProductId && (
              <p className="text-xs text-slate-500 mt-0.5">
                Define the garment details once. Then simply fill in the image, color, stock, and price for each colorway. Each item will be displayed individually on the storefront.
              </p>
            )}
          </div>

          {/* Creation Mode Switcher (only for new products) */}
          {!editingProductId && (
            <div className="flex items-center gap-2 mb-4 p-1 bg-slate-100 rounded-xl flex-shrink-0">
              <button
                type="button"
                onClick={() => setCreateMode('single')}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  createMode === 'single'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Single Product</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('bulk')}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  createMode === 'bulk'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bulk Color Variants</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border border-indigo-200/60">
                  Multiple Colors
                </span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* BULK COLOR VARIANTS FORM */}
          {/* ======================================================== */}
          {createMode === 'bulk' && !editingProductId ? (
            <form onSubmit={handleBulkSubmit} className="space-y-5 overflow-y-auto pr-1 flex-grow">
              {bulkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Step 1: One-Time Shared Information */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-[11px] font-bold">1</span>
                    Shared Garment Information (One-Time Fill)
                  </span>
                  <span className="text-[11px] text-slate-500">Applies to all colors below</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Base Name */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Base Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bulkShared.baseName}
                      onChange={(e) => setBulkShared((prev) => ({ ...prev, baseName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="e.g. AURA Aurora Top, AURA Petal Skirt"
                    />
                    <p className="text-[10px] text-slate-400">
                      Variant name format: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">[Base Name] in [Color]</code>
                    </p>
                  </div>

                  {/* Category Group */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Category Group *
                    </label>
                    <select
                      value={bulkShared.mainCategory}
                      onChange={(e) => handleBulkCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none cursor-pointer"
                    >
                      <option value="top">Tops</option>
                      <option value="bottom">Bottoms</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Subtype */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Subtype / Section *
                    </label>
                    <input
                      type="text"
                      required
                      value={bulkShared.subType}
                      onChange={(e) => setBulkShared((prev) => ({ ...prev, subType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="e.g. Aurora, Corset, Skirt"
                    />
                  </div>

                  {/* Default Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Default Price (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bulkShared.defaultPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkShared((prev) => ({ ...prev, defaultPrice: val }));
                        // Auto-fill variant prices that are empty
                        setVariants((prev) =>
                          prev.map((v) => (v.price === '' ? { ...v, price: val } : v))
                        );
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="389"
                    />
                  </div>

                  {/* Default Stock Qty */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Default Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bulkShared.defaultQty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkShared((prev) => ({ ...prev, defaultQty: val }));
                        // Auto-fill variant stocks that are empty or equal previous default
                        setVariants((prev) =>
                          prev.map((v) => (v.qty === '' ? { ...v, qty: val } : v))
                        );
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="50"
                    />
                  </div>

                  {/* Target Discount (%) */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Discount (% Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={bulkShared.discountPercent}
                      onChange={(e) => setBulkShared((prev) => ({ ...prev, discountPercent: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="e.g. 15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sizes */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Sizes Available
                    </label>
                    <input
                      type="text"
                      value={bulkShared.sizes}
                      onChange={(e) => setBulkShared((prev) => ({ ...prev, sizes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                      placeholder="XXS-XS, S-M, L, XL"
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Garment Status
                    </label>
                    <select
                      value={bulkShared.statusBadge}
                      onChange={(e) => setBulkShared((prev) => ({ ...prev, statusBadge: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none cursor-pointer"
                    >
                      <option value="">IN STOCK (Normal)</option>
                      <option value="NEW ARRIVAL">NEW ARRIVAL</option>
                      <option value="BEST SELLER">BEST SELLER</option>
                      <option value="PRE-ORDER">PRE-ORDER</option>
                      <option value="SOLD OUT">SOLD OUT</option>
                    </select>
                  </div>
                </div>

                {/* Description Heading & Template Selector */}
                <div className="space-y-2 pt-1 border-t border-slate-200/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                      Description & Craftsmanship Story
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBulkShared((prev) => ({ ...prev, description: TOPS_DEFAULT_DESC }))}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        Reset Tops Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkShared((prev) => ({ ...prev, description: BOTTOMS_DEFAULT_DESC }))}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        Reset Bottoms Template
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={bulkShared.description}
                    onChange={(html) => setBulkShared((prev) => ({ ...prev, description: html }))}
                    placeholder="Describe material and tailoring details..."
                  />
                </div>
              </div>

              {/* Step 2: Colorways & Inventory */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white inline-flex items-center justify-center text-[11px] font-bold">2</span>
                      Color Variants ({variants.length})
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Only 4 fields per color: <strong>Color Name</strong>, <strong>Portrait Media</strong>, <strong>Stock</strong>, and <strong>Price</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200/80 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Colorway</span>
                  </button>
                </div>

                {/* Variant Rows Table / Grid */}
                <div className="space-y-3">
                  {variants.map((variant, index) => {
                    const colorHex = getHexForColorName(variant.color);
                    return (
                      <div
                        key={variant.id}
                        className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col md:flex-row md:items-center gap-3 transition-colors"
                      >
                        {/* Variant Row Number & Color Preview Swatch */}
                        <div className="flex items-center gap-2 md:w-48 shrink-0">
                          <span className="text-xs font-bold font-mono text-slate-400 w-5">
                            #{index + 1}
                          </span>
                          <div className="relative flex-1">
                            <input
                              type="text"
                              required
                              placeholder="e.g. White Polka, Plum"
                              value={variant.color}
                              onChange={(e) => handleVariantChange(variant.id, 'color', e.target.value)}
                              className="w-full pl-7 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full absolute left-2 top-1/2 -translate-y-1/2 border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: colorHex }}
                              title={`Preview Color Swatch: ${colorHex}`}
                            />
                          </div>
                        </div>

                        {/* Image / Media Upload */}
                        <div className="flex items-center gap-2 md:w-56 shrink-0">
                          <input
                            type="file"
                            id={`file-${variant.id}`}
                            accept="image/*,video/*"
                            onChange={(e) => handleRowImageUpload(variant.id, e)}
                            className="hidden"
                            disabled={variant.isUploading}
                          />

                          {variant.isUploading ? (
                            <div className="h-14 w-full flex items-center justify-center gap-2 bg-indigo-50/60 border border-dashed border-indigo-300 rounded-lg text-indigo-600 text-xs">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-[10px] font-semibold">Uploading...</span>
                            </div>
                          ) : variant.image ? (
                            <div className="flex items-center gap-2 w-full p-1 bg-white border border-slate-200 rounded-lg">
                              {isVideoUrl(variant.image) ? (
                                <video
                                  src={variant.image}
                                  muted
                                  playsInline
                                  className="w-9 h-12 object-cover rounded bg-slate-100 shrink-0"
                                />
                              ) : (
                                <img
                                  src={variant.image}
                                  alt={variant.color || 'Variant Preview'}
                                  className="w-9 h-12 object-cover rounded bg-slate-100 shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-emerald-700 block truncate">
                                  ✓ Portrait Loaded
                                </span>
                                <label
                                  htmlFor={`file-${variant.id}`}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                                >
                                  Replace Media
                                </label>
                              </div>
                            </div>
                          ) : (
                            <label
                              htmlFor={`file-${variant.id}`}
                              className="h-14 w-full flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 rounded-lg text-center cursor-pointer transition-colors p-1"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
                              <span className="text-[10px] font-semibold text-slate-700">
                                Upload Portrait *
                              </span>
                            </label>
                          )}
                        </div>

                        {/* Stock Quantity */}
                        <div className="flex-1 min-w-[90px]">
                          <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-0.5 md:hidden">
                            Stock Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="Stock"
                            value={variant.qty}
                            onChange={(e) => handleVariantChange(variant.id, 'qty', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            title="Stock Quantity for this colorway"
                          />
                        </div>

                        {/* Selling Price */}
                        <div className="flex-1 min-w-[90px]">
                          <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-0.5 md:hidden">
                            Price (₱)
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Price ₱"
                            value={variant.price || bulkShared.defaultPrice}
                            onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            title="Price for this colorway"
                          />
                        </div>

                        {/* Action buttons (Duplicate / Remove) */}
                        <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => handleDuplicateVariant(index)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                            title="Duplicate this colorway row"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            disabled={variants.length <= 1}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              variants.length <= 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-white'
                            }`}
                            title="Remove colorway"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="w-full py-2.5 border border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Colorway Variant</span>
                </button>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                  Ready to publish{' '}
                  <strong className="text-indigo-700">{variants.length} color variants</strong> as individual garments in the catalog.
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <LuxuryButton
                    variant="outline"
                    type="button"
                    onClick={onClose}
                    disabled={isSubmittingBulk}
                  >
                    Cancel
                  </LuxuryButton>
                  <button
                    type="submit"
                    disabled={isSubmittingBulk}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingBulk ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing Garments...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Publish {variants.length} Colorways</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* SINGLE PRODUCT FORM (Original Standard Mode) */
            /* ======================================================== */
            <form onSubmit={onSaveProduct} className="space-y-4 overflow-y-auto pr-2 flex-grow">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    placeholder="e.g. AURA Aurora Top in White Polka"
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
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Subtype / Section *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.subType}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, subType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                    placeholder="e.g. Aurora, Corset, Skirt"
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

              <div className="grid grid-cols-2 gap-4">
                {/* Regular Price */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Regular Price (₱) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProduct.originalPrice || newProduct.price}
                    onChange={(e) => {
                      const regPrice = e.target.value;
                      const pct = Number(newProduct.discountPercent) || 0;
                      const newSelling = pct > 0 ? Math.round(Number(regPrice) * (1 - pct / 100)) : regPrice;
                      setNewProduct(prev => ({
                        ...prev,
                        originalPrice: regPrice,
                        price: newSelling
                      }));
                    }}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                  />
                </div>

                {/* Target Item Discount (%) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] flex items-center justify-between">
                    <span>Target Discount (%)</span>
                    {Number(newProduct.discountPercent) > 0 && (
                      <span className="text-[9px] text-[#BE123C] bg-[#FFE4E6] border border-[#FECDD3] px-1.5 py-0.2 font-bold">
                        {newProduct.discountPercent}% OFF
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    placeholder="0 (No discount)"
                    value={newProduct.discountPercent || ''}
                    onChange={(e) => {
                      const pct = Math.max(0, Math.min(90, Number(e.target.value) || 0));
                      const basePrice = Number(newProduct.originalPrice) || Number(newProduct.price) || 0;
                      const newSelling = pct > 0 ? Math.round(basePrice * (1 - pct / 100)) : basePrice;
                      setNewProduct(prev => ({
                        ...prev,
                        discountPercent: e.target.value,
                        originalPrice: basePrice,
                        price: newSelling,
                        discountBadge: pct > 0 ? `${pct}% OFF` : ''
                      }));
                    }}
                    className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newProduct.qty}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, qty: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                />
              </div>

              {/* Colors */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Colors (comma separated)</label>
                <input
                  type="text"
                  value={newProduct.colorsRaw || ''}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, colorsRaw: e.target.value }))}
                  className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                  placeholder="e.g. White Polka, Onyx Black"
                />
              </div>

              {/* Sizes Range Input */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Available Sizes</label>
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
                  Product Media (Portrait Photo or Video) *
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
                        loading="lazy"
                        decoding="async"
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
                      Portrait photo or video. Height must be greater than width.
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
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

AdminProductModal.displayName = 'AdminProductModal';

export default AdminProductModal;
