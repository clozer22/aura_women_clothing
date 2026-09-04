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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl space-y-8"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}
    >
      <div>
        <span className="font-script text-[4rem] sm:text-[5rem] leading-none text-[#B86B60] block -mb-2">Visual Atelier</span>
        <h2 className="text-3xl sm:text-5xl font-editorial font-light text-[#2C1E1B] tracking-tight">Frontpage Style Customizer</h2>
      </div>

      {/* Main Form Fields (Preview removed to save GPU/CPU video memory) */}
      <div className="bg-white border border-[#E8DCD7] shadow-sm p-8 rounded-none space-y-6">
        <h3 className="font-editorial text-2xl text-[#2C1E1B] pb-2 border-b border-[#E8DCD7]/60">Customize Hero Banner</h3>

        <div className="space-y-4">
          {/* Poster Image / Video */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
              Main Poster
            </label>
            <div className="flex items-center gap-4">
              <label className={`cursor-pointer border border-[#E8DCD7] text-[#2C1E1B] text-xs font-semibold px-4 py-3 rounded-none flex items-center gap-2 transition-all ${isUploadingPoster ? 'bg-[#E8DCD7] opacity-75 cursor-not-allowed' : 'bg-[#FAF0EC] hover:bg-[#E8DCD7]/50'
                }`}>
                {isUploadingPoster ? (
                  <div className="w-4 h-4 border-2 border-[#705B56]/30 border-t-[#705B56] rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-[#705B56]" />
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
              <span className="text-[10px] text-[#705B56] truncate max-w-[200px]">
                {isUploadingPoster ? 'Uploading to storage...' : (localHeroConfig.posterUrl ? 'File selected & active' : 'No file selected')}
              </span>
            </div>
            <p className="text-[9px] text-[#A38E88] leading-relaxed">
              Supports PNG, JPG, MP4, MOV, WEBM.<br />
              <strong className="text-[#B86B60]">Recommended: 1920 x 1080px (16:9) or 1600 x 1200px (4:3) with subject centered</strong> both horizontally and vertically (crop-safe for both desktop landscape and mobile portrait).
            </p>
          </div>

          {/* Display Title */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">Display Branding Title</label>
            <input
              type="text"
              value={localHeroConfig.title}
              onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
            />
          </div>
        </div>

        <h3 className="font-editorial text-2xl text-[#2C1E1B] pb-2 border-b border-[#E8DCD7]/60 pt-4">Customize About Us</h3>

        <div className="space-y-4">
          {/* About Media */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">
              About Us Featured Media (Manual Upload)
            </label>
            <div className="flex items-center gap-4">
              <label className={`cursor-pointer border border-[#E8DCD7] text-[#2C1E1B] text-xs font-semibold px-4 py-3 rounded-none flex items-center gap-2 transition-all ${isUploadingAboutMedia ? 'bg-[#E8DCD7] opacity-75 cursor-not-allowed' : 'bg-[#FAF0EC] hover:bg-[#E8DCD7]/50'
                }`}>
                {isUploadingAboutMedia ? (
                  <div className="w-4 h-4 border-2 border-[#705B56]/30 border-t-[#705B56] rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-[#705B56]" />
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
              <span className="text-[10px] text-[#705B56] truncate max-w-[200px]">
                {isUploadingAboutMedia ? 'Uploading to storage...' : (localHeroConfig.aboutMediaUrl ? 'File selected & active' : 'No file selected')}
              </span>
            </div>
            <p className="text-[9px] text-[#A38E88] leading-relaxed">
              Supports PNG, JPG, MP4, MOV, WEBM.<br />
              <strong className="text-[#B86B60]">Recommended: 1920 x 1080px (16:9) or 1600 x 1200px (4:3) with subject on the left</strong> (to keep the text readable on the right on desktop views).
            </p>
          </div>

          {/* About Title & Subtitle in 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Title</label>
              <input
                type="text"
                value={localHeroConfig.aboutTitle || ''}
                onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, aboutTitle: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                placeholder="Oh What?"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Subtitle</label>
              <input
                type="text"
                value={localHeroConfig.aboutSubtitle || ''}
                onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, aboutSubtitle: e.target.value }))}
                className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B]"
                placeholder="Sakura Blossom - Milky Lavender"
              />
            </div>
          </div>

          {/* About Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#705B56] block">About Description Narrative</label>
            <textarea
              rows={5}
              value={localHeroConfig.aboutDescription || ''}
              onChange={(e) => setLocalHeroConfig(prev => ({ ...prev, aboutDescription: e.target.value }))}
              className="w-full px-4 py-3 rounded-none bg-[#FAF0EC] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] resize-y"
              placeholder="About Us description narrative..."
            />
          </div>
        </div>

        <LuxuryButton
          variant="primary"
          onClick={onApplyCustomizations}
          disabled={isSavingTheme || isUploadingPoster || isUploadingAboutMedia}
          isLoading={isSavingTheme}
          loadingText="Saving Theme Configurations..."
          icon={Save}
          size="lg"
          className="w-full mt-6 py-4"
        >
          Apply Theme Settings
        </LuxuryButton>
      </div>
    </motion.div>
  );
});

AdminCustomizerTab.displayName = 'AdminCustomizerTab';

export default AdminCustomizerTab;
