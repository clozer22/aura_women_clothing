import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Star, Edit, Trash2, Globe, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';

const AdminProductsTab = memo(({
  productList,
  totalProductsCount,
  currentPage,
  pageSize,
  totalPages,
  searchQuery,
  categoryFilter,
  featuredCount,
  selectedProductIds,
  isLoadingProducts,
  onSearchChange,
  onCategoryChange,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleFeatured,
  onSelectAllFiltered,
  onToggleSelectProduct,
  onOpenBulkModal,
  onDeleteSelected,
  onPageChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 900px' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-script text-[4rem] sm:text-[5rem] text-[#2C1E1B] block mb-1 leading-none">Catalog Admin</span>
          <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Atelier Garment Inventory</h2>
        </div>
        <LuxuryButton
          variant="primary"
          onClick={onAddProduct}
          icon={Plus}
          size="lg"
        >
          Add Product
        </LuxuryButton>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white border border-[#E8DCD7] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 rounded-none">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#705B56] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code/name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] placeholder-[#A38E88] focus:outline-none focus:border-[#2C1E1B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs font-semibold text-[#705B56]">
            Featured in Collection: <strong className="text-[#B86B60]">{featuredCount}/6</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#705B56] font-semibold">Filter:</span>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] font-semibold rounded-none px-4 py-2.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="top">Tops</option>
              <option value="bottom">Bottoms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div id="admin-products-table-container" className="bg-white border border-[#E8DCD7] shadow-sm overflow-x-auto rounded-none relative">
        {isLoadingProducts && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#B86B60] animate-pulse z-20" />
        )}
        {selectedProductIds.length > 0 && (
          <div className="bg-[#FAF5F2] p-3 border-b border-[#E8DCD7] flex items-center justify-between px-6 sticky left-0 right-0 z-10 shadow-sm animate-fadeIn">
            <span className="text-xs font-semibold text-[#705B56]">
              Selected <strong className="text-[#B86B60]">{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? 'garment' : 'garments'}
            </span>
            <div className="flex items-center gap-2">
              <LuxuryButton
                variant="dark"
                size="sm"
                icon={Edit}
                onClick={onOpenBulkModal}
              >
                Bulk Update
              </LuxuryButton>
              <LuxuryButton
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={onDeleteSelected}
              >
                Delete Selected
              </LuxuryButton>
            </div>
          </div>
        )}
        <table className="w-full text-left border-collapse rounded-none">
          <thead>
            <tr className="bg-[#F3EAE6] border-b border-[#E8DCD7] text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
              <th className="p-4 text-center w-12">
                <input
                  type="checkbox"
                  checked={productList.length > 0 && productList.every(p => selectedProductIds.includes(p.id))}
                  onChange={() => onSelectAllFiltered(productList)}
                  className="w-4 h-4 rounded-none accent-[#2C1E1B] cursor-pointer"
                  title="Select All on page"
                />
              </th>
              <th className="p-4 text-center">Featured</th>
              <th className="p-4">Thumbnail</th>
              <th className="p-4">Product Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Colors</th>
              <th className="p-4">Sizes</th>
              <th className="p-4">Price</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Solds</th>
              <th className="p-4">Shopee Link</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8DCD7]/60 text-xs font-semibold text-[#2C1E1B]">
            {productList.map((p) => (
              <tr key={p.id} className={`hover:bg-[#FAF5F2]/40 transition-colors ${selectedProductIds.includes(p.id) ? 'bg-[#FAF0EC]' : ''}`}>
                <td className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => onToggleSelectProduct(p.id)}
                    className="w-4 h-4 rounded-none accent-[#2C1E1B] cursor-pointer"
                  />
                </td>
                <td className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleFeatured(p.id, !p.isFeatured)}
                    disabled={!p.isFeatured && featuredCount >= 6}
                    className="focus:outline-none flex items-center justify-center mx-auto transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                    title={!p.isFeatured && featuredCount >= 6 ? "Maximum 6 featured items reached" : "Toggle featured status"}
                  >
                    {p.isFeatured ? (
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500 hover:scale-110 transition-transform" />
                    ) : (
                      <Star className={`w-5 h-5 transition-transform hover:scale-110 ${featuredCount >= 6
                        ? 'text-[#ccc2c3]/30 cursor-not-allowed'
                        : 'text-[#ccc2c3] hover:text-amber-400'
                        }`} />
                    )}
                  </button>
                </td>
                <td className="p-4">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-12 object-cover border border-[#E8DCD7] rounded-none"
                  />
                </td>
                <td className="p-4 font-normal text-sm text-[#2C1E1B]">{p.name}</td>
                <td className="p-4">
                  <span className="text-[#705B56] uppercase tracking-wider text-[10px] block">{p.mainCategory === 'top' ? 'Top' : 'Bottom'}</span>
                  <span className="text-[9px] text-[#A38E88] font-normal">{p.subType}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {p.colors && p.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-none border border-black/10 inline-block"
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </td>
                <td className="p-4 text-[#705B56] uppercase tracking-wider text-[10px]">
                  {Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || 'XXS-XS, S-M, L, XL')}
                </td>
                <td className="p-4 font-mono text-gray-800">₱{Number(p.price)?.toLocaleString()}</td>
                <td className="p-4 font-mono text-amber-600">{p.rating} ★</td>
                <td className="p-4 font-mono text-gray-600">{p.solds} sold</td>
                <td className="p-4">
                  <a
                    href={p.shopeeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B86B60] hover:text-[#2C1E1B] transition-colors flex items-center gap-1 text-[10px]"
                  >
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[80px] block">Shopee</span>
                  </a>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-none border ${p.statusBadge === 'ARCHIVE'
                    ? 'bg-gray-100 text-gray-700 border-gray-300'
                    : p.statusBadge === 'SOLD OUT'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : p.statusBadge === 'PRE-ORDER'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                    {p.statusBadge || 'IN STOCK'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditProduct(p)}
                      className="p-2 rounded-none text-[#705B56] hover:text-white hover:bg-[#705B56] border border-[#E8DCD7] transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-2 rounded-none text-red-700 hover:text-white hover:bg-red-700 border border-red-200 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoadingProducts && productList.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[#705B56] bg-white">
            <Loader2 className="w-6 h-6 animate-spin text-[#B86B60]" />
            <span className="tracking-wider uppercase font-semibold text-[10px]">Loading garments...</span>
          </div>
        )}

        {!isLoadingProducts && productList.length === 0 && (
          <div className="text-center py-16 text-[#A38E88] text-xs bg-white">
            No garments found matching the selected query.
          </div>
        )}

        {/* Luxury Pagination Controls (10 items per page) */}
        <div className="bg-[#FAF5F2] border-t border-[#E8DCD7] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#705B56] font-medium">
            Showing <span className="font-bold text-[#2C1E1B]">{totalProductsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-[#2C1E1B]">{Math.min(currentPage * pageSize, totalProductsCount)}</span> of <span className="font-bold text-[#2C1E1B]">{totalProductsCount}</span> garments (10 per page)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-[#E8DCD7] text-xs font-semibold text-[#2C1E1B] bg-white hover:bg-[#FAF0EC] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && (
                        <span className="px-1 text-xs text-[#705B56]">...</span>
                      )}
                      <button
                        onClick={() => onPageChange(p)}
                        className={`w-7 h-7 text-xs font-bold transition-all cursor-pointer ${currentPage === p
                          ? 'bg-[#2C1E1B] text-white shadow-sm'
                          : 'bg-white border border-[#E8DCD7] text-[#705B56] hover:bg-[#FAF0EC]'
                          }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-[#E8DCD7] text-xs font-semibold text-[#2C1E1B] bg-white hover:bg-[#FAF0EC] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

AdminProductsTab.displayName = 'AdminProductsTab';

export default AdminProductsTab;
