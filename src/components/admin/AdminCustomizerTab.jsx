import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Upload, Save } from 'lucide-react';
import LuxuryButton from '../common/LuxuryButton';

const AdminCustomizerTab = memo(({
  localHeroConfig,
  setLocalHeroConfig,
  isUploadingPoster,
  isUploadingAboutMedia,
  isSavingTheme,
  onMediaUpload,
  onApplyCustomizations,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl space-y-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
            Settings
          </span>
          <span className="text-xs text-slate-400 font-medium">Frontpage Branding & Media</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
          Store Customizer
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Update hero banners, branding titles, and About Us sections on the storefront.
        </p>
      </div>

      {/* Main Form Fields */}
      <div className="bg-white border border-slate-200/80 shadow-xs p-6 sm:p-8 rounded-2xl space-y-6">
        <h3 className="font-sans font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
          Hero Banner
        </h3>

        <div className="space-y-4">
          {/* Poster Image / Video */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">
              Main Banner Media
            </label>
            <div className="flex items-center gap-4">
              <label className={`cursor-pointer border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${isUploadingPoster ? 'bg-slate-100 opacity-75 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100'
                }`}>
                {isUploadingPoster ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-slate-500" />
                )}
                <span>{isUploadingPoster ? 'Uploading Poster...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept=".png, .jpg, .jpeg, .mp4, .mov, .webm"
                  onChange={(e) => onMediaUpload(e, 'poster')}
                  className="hidden"
                  disabled={isUploadingPoster || isSavingTheme}
                />
              </label>
              <span className="text-xs text-slate-500 truncate max-w-[220px]">
                {isUploadingPoster ? 'Uploading to storage...' : (localHeroConfig.posterUrl ? 'File active on storefront' : 'No file selected')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Supports PNG, JPG, MP4, MOV, WEBM.<br />
              <strong className="text-slate-600">Recommended: 1920 x 1080px (16:9) or 1600 x 1200px (4:3) with subject centered</strong>.
            </p>
          </div>

          {/* Display Title */}
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">Display Branding Title</label>
            <input
              type="text"
              value={localHeroConfig.title}
              onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <h3 className="font-sans font-bold text-base text-slate-900 pb-3 border-b border-slate-100 pt-4">
          About Us Section
        </h3>

        <div className="space-y-4">
          {/* About Media */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">
              About Us Featured Media
            </label>
            <div className="flex items-center gap-4">
              <label className={`cursor-pointer border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${isUploadingAboutMedia ? 'bg-slate-100 opacity-75 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100'
                }`}>
                {isUploadingAboutMedia ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-slate-500" />
                )}
                <span>{isUploadingAboutMedia ? 'Uploading Media...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept=".png, .jpg, .jpeg, .mp4, .mov, .webm"
                  onChange={(e) => onMediaUpload(e, 'about')}
                  className="hidden"
                  disabled={isUploadingAboutMedia || isSavingTheme}
                />
              </label>
              <span className="text-xs text-slate-500 truncate max-w-[220px]">
                {isUploadingAboutMedia ? 'Uploading to storage...' : (localHeroConfig.aboutMediaUrl ? 'File active on storefront' : 'No file selected')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Supports PNG, JPG, MP4, MOV, WEBM.<br />
              <strong className="text-slate-600">Recommended: 1920 x 1080px (16:9) with subject on left</strong>.
            </p>
          </div>

          {/* About Title & Subtitle in 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">About Title</label>
              <input
                type="text"
                value={localHeroConfig.aboutTitle || ''}
                onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, aboutTitle: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="Oh What?"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">About Subtitle</label>
              <input
                type="text"
                value={localHeroConfig.aboutSubtitle || ''}
                onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, aboutSubtitle: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="Sakura Blossom"
              />
            </div>
          </div>

          {/* About Description */}
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 block">About Description Narrative</label>
            <textarea
              rows={4}
              value={localHeroConfig.aboutDescription || ''}
              onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, aboutDescription: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-y"
              placeholder="About Us description narrative..."
            />
          </div>
        </div>

        <button
          onClick={onApplyCustomizations}
          disabled={isSavingTheme || isUploadingPoster || isUploadingAboutMedia}
          className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSavingTheme ? 'Saving Theme Configurations...' : 'Save Theme Settings'}</span>
        </button>
      </div>
    </motion.div>
  );
});

AdminCustomizerTab.displayName = 'AdminCustomizerTab';

export default AdminCustomizerTab;
