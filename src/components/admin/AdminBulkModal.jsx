import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';

const AdminBulkModal = memo(({
  isOpen,
  selectedCount,
  bulkSizeChart,
  setBulkSizeChart,
  isUploadingSizeChart,
  onBulkSizeChartUpload,
  onBulkUpdate,
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
          className="relative z-10 w-full max-w-md bg-white rounded-none shadow-2xl border border-[#E8DCD7] p-6 sm:p-8 flex flex-col max-h-[90vh] md:max-h-[85vh] select-none"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#705B56] hover:text-[#2C1E1B] transition-colors p-1 z-10 cursor-pointer"
            aria-label="Close bulk modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 flex-shrink-0">
            <h3 className="font-editorial text-2xl sm:text-3xl text-[#2C1E1B] font-normal leading-tight">
              Bulk Update Size Chart
            </h3>
            <p className="text-[10px] text-[#705B56] mt-1.5 leading-relaxed font-semibold">
              Upload a size chart image below. It will be applied to the {selectedCount} selected garments.
            </p>
          </div>

          <form onSubmit={onBulkUpdate} className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
            {/* Size Chart Image Uploader */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">
                Select Size Chart Image
              </label>
              <input
                type="file"
                id="bulk-sizechart-file"
                accept="image/*"
                onChange={onBulkSizeChartUpload}
                className="hidden"
                disabled={isUploadingSizeChart}
              />

              {isUploadingSizeChart ? (
                <div className="h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-t-transparent border-[#B86B60] rounded-full animate-spin" />
                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#B86B60]">Uploading Size Chart...</span>
                </div>
              ) : bulkSizeChart ? (
                <div className="flex items-center gap-4 p-3 bg-[#FAF0EC] border border-[#E8DCD7] rounded-none">
                  <img
                    src={bulkSizeChart}
                    alt="Bulk Size Chart Preview"
                    className="w-20 h-16 object-contain border border-[#E8DCD7] bg-white flex-shrink-0"
                  />
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-none block w-max">
                      Image Loaded
                    </span>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="bulk-sizechart-file"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E8DCD7] text-[10px] font-bold uppercase tracking-wider text-[#2C1E1B] cursor-pointer transition-colors"
                      >
                        <Upload className="w-3 h-3 text-[#B86B60]" />
                        Replace Image
                      </label>
                      <button
                        type="button"
                        onClick={() => setBulkSizeChart('')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-[10px] font-bold uppercase tracking-wider text-red-600 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="bulk-sizechart-file"
                  className="flex flex-col items-center justify-center h-28 border border-dashed border-[#E8DCD7] bg-[#FAF0EC] hover:bg-[#FAF0EC]/60 transition-colors cursor-pointer text-center p-4 gap-1.5 rounded-none"
                >
                  <Upload className="w-5 h-5 text-[#B86B60]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#705B56]">Upload Size Chart Image</span>
                  <span className="text-[9px] text-[#A38E88] font-medium leading-normal">
                    Supports PNG, JPG, WEBP.
                  </span>
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8DCD7] mt-6 flex-shrink-0">
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
                disabled={!bulkSizeChart || isUploadingSizeChart}
              >
                Apply Bulk Size Chart
              </LuxuryButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

AdminBulkModal.displayName = 'AdminBulkModal';

export default AdminBulkModal;
