import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Star, Edit, Trash2, Globe, ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';
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
  const handleExportCSV = () => {
    if (!productList || productList.length === 0) return;

    const headers = [
      'Product ID',
      'Name',
      'Category',
      'Sub Type',
      'Price',
      'Quantity',
      'Rating',
      'Sold',
      'Created At',
      'Status Badge'
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [headers.join(',')];

    productList.forEach(product => {
      const row = [
        product.id,
        product.name,
        product.category,
        product.subType,
        product.price,
        product.qty,
        product.rating,
        product.solds,
        product.created_at,
        product.statusBadge
      ].map(escapeCSV);

      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Products_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 900px' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Inventory
            </span>
            <span className="text-xs text-slate-400 font-medium">Catalog Products & Stock</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
            Manage Products
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, edit, restock, and bulk update inventory items across your storefront.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onAddProduct}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl font-medium">
            Featured: <strong className="text-blue-600">{featuredCount}/6</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold text-[10px]">Filter:</span>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="top">Tops</option>
              <option value="bottom">Bottoms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div id="admin-products-table-container" className="bg-white border border-slate-200/80 shadow-xs overflow-x-auto rounded-2xl relative">
        {isLoadingProducts && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse z-20" />
        )}
        {selectedProductIds.length > 0 && (
          <div className="bg-blue-50/70 p-3 border-b border-blue-100 flex items-center justify-between px-6 sticky left-0 right-0 z-10 shadow-xs animate-fadeIn">
            <span className="text-xs font-semibold text-blue-900">
              Selected <strong className="text-blue-700">{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? 'garment' : 'garments'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenBulkModal}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Bulk Update</span>
              </button>
              <button
                onClick={onDeleteSelected}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase tracking-wider font-bold text-slate-500">
              <th className="p-3.5 text-center w-12">
                <input
                  type="checkbox"
                  checked={productList.length > 0 && productList.every(p => selectedProductIds.includes(p.id))}
                  onChange={() => onSelectAllFiltered(productList)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  title="Select All on page"
                />
              </th>
              <th className="p-3.5 text-center">Featured</th>
              <th className="p-3.5">Thumbnail</th>
              <th className="p-3.5">Product Name</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Colors</th>
              <th className="p-3.5">Sizes</th>
              <th className="p-3.5">Price</th>
              <th className="p-3.5">Rating</th>
              <th className="p-3.5">Solds</th>
              <th className="p-3.5">Shopee</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {productList.map((p) => (
              <tr key={p.id} className={`hover:bg-slate-50/70 transition-colors ${selectedProductIds.includes(p.id) ? 'bg-blue-50/30' : ''}`}>
                <td className="p-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => onToggleSelectProduct(p.id)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                </td>
                <td className="p-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleFeatured(p.id, !p.isFeatured)}
                    disabled={!p.isFeatured && featuredCount >= 6}
                    className="focus:outline-none flex items-center justify-center mx-auto transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                    title={!p.isFeatured && featuredCount >= 6 ? "Maximum 6 featured items reached" : "Toggle featured status"}
                  >
                    {p.isFeatured ? (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 hover:scale-110 transition-transform" />
                    ) : (
                      <Star className={`w-4 h-4 transition-transform hover:scale-110 ${featuredCount >= 6
                        ? 'text-slate-200 cursor-not-allowed'
                        : 'text-slate-300 hover:text-amber-400'
                        }`} />
                    )}
                  </button>
                </td>
                <td className="p-3.5">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-12 object-cover border border-slate-200 rounded-lg"
                  />
                </td>
                <td className="p-3.5 font-medium text-slate-900">{p.name}</td>
                <td className="p-3.5">
                  <span className="text-slate-700 uppercase tracking-wider text-[10px] font-semibold block">{p.mainCategory === 'top' ? 'Top' : 'Bottom'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{p.subType}</span>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1">
                    {p.colors && p.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </td>
                <td className="p-3.5 text-slate-500 text-[10px]">
                  {Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || 'XXS-XS, S-M, L, XL')}
                </td>
                <td className="p-3.5 font-semibold text-slate-800">₱{Number(p.price)?.toLocaleString()}</td>
                <td className="p-3.5 font-semibold text-amber-600">{p.rating} ★</td>
                <td className="p-3.5 text-slate-500">{p.solds} sold</td>
                <td className="p-3.5">
                  <a
                    href={p.shopeeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-[11px]"
                  >
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[80px] block">Shopee</span>
                  </a>
                </td>
                <td className="p-3.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.statusBadge === 'ARCHIVE'
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : p.statusBadge === 'SOLD OUT'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : p.statusBadge === 'PRE-ORDER'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                    {p.statusBadge || 'IN STOCK'}
                  </span>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditProduct(p)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 transition-colors cursor-pointer"
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
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 bg-white">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="font-medium">Loading catalog items...</span>
          </div>
        )}

        {!isLoadingProducts && productList.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-xs bg-white">
            No garments found matching the selected query.
          </div>
        )}

        {/* Modern Pagination Controls (10 items per page) */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{totalProductsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, totalProductsCount)}</span> of <span className="font-bold text-slate-900">{totalProductsCount}</span> garments
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-1"
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
                        <span className="px-1 text-xs text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => onPageChange(p)}
                        className={`w-7 h-7 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentPage === p
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
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
              className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-1"
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
