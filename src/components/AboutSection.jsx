import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AboutSection({ config }) {
  // Safe fallbacks for config custom fields (no hardcoded fallback image so we only show shimmer while loading)
  const safeConfig = config || {};
  const mediaUrl = safeConfig.aboutMediaUrl || null;
  const mediaType = safeConfig.aboutMediaType || 'image';
  const isVideoUrl = mediaUrl && (
                     mediaType === 'video' || 
                     mediaUrl.startsWith('data:video/') || 
                     (typeof mediaUrl === 'string' && !!mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i)));
  const title = String(safeConfig.aboutTitle || 'Oh What?');
  const subtitle = String(safeConfig.aboutSubtitle || 'Sakura Blossom - Milky Lavender');

  const defaultDesc = 'The Brightening Secret. Lavender blushes are a viral beauty secret for a reason! This milky purple is a dream for fair skin and Asian skin tones, as the purple pigment acts as a color corrector to neutralize sallow or yellow tones, leaving a bright, "ethereal" glow.\n\nOn white skin with cool undertones, it creates a unique, high-fashion pastel flush. For darker skin, it can be used as a targeted brightening topper over a deeper blush to add a modern, multidimensional finish.';
  const description = String(safeConfig.aboutDescription || defaultDesc);

  const [loaded, setLoaded] = useState(false);
  const mediaRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
  }, [mediaUrl]);

  // Check if resource is cached and already loaded
  useEffect(() => {
    if (mediaRef.current) {
      if (isVideoUrl) {
        if (mediaRef.current.readyState >= 3) {
          setLoaded(true);
        }
      } else {
        if (mediaRef.current.complete) {
          setLoaded(true);
        }
      }
    }
  }, [mediaUrl, isVideoUrl]);

  // Split title into stacked display words
  const titleWords = title.split(' ');
  // Split description paragraphs
  const paragraphs = description.split('\n\n');

  return (
    <section id="about" className="relative min-h-[600px] w-full flex items-center justify-end py-24 sm:py-32 px-6 sm:px-12 md:px-20 lg:px-32 overflow-hidden select-none bg-[#fff3f7]">
      {/* Shimmer Placeholder while fetching or loading */}
      {(!loaded || !mediaUrl) && (
        <div className="absolute inset-0 skeleton-shimmer z-20" />
      )}

      {/* Background Media */}
      {mediaUrl ? (
        isVideoUrl ? (
          <video
            ref={mediaRef}
            src={mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover object-left transition-opacity duration-700 ease-out ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <img
            ref={mediaRef}
            src={mediaUrl}
            alt="Aura Atelier Brand Background"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover object-left transition-opacity duration-700 ease-out ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      ) : null}



      {/* Decorative page markers (Top-Left 02 & Bottom-Right 03 matching the layout) */}
      <div className="absolute top-8 left-8 text-2xl font-editorial font-light text-white/40 z-20">
        02
      </div>
      <div className="absolute bottom-8 right-8 text-2xl font-editorial font-light text-white/40 z-20">
        03
      </div>

      {/* Right-Aligned Text Container */}
      <div className="max-w-5xl w-full mx-auto relative z-20 flex justify-end">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full md:w-[50%] flex flex-col justify-center text-left"
        >
          {/* Main editorial stacked heading */}
          <div className="mb-4">
            {titleWords.map((word, idx) => (
              <span
                key={idx}
                className="block font-editorial italic font-light tracking-tight leading-none text-white text-6xl sm:text-8xl drop-shadow-md"
              >
                {word}
              </span>
            ))}
          </div>

          {/* Subtitle / Tone Label */}
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#D99B91] mb-8 block drop-shadow-sm">
            {subtitle}
          </span>

          {/* Text description paragraphs */}
          <div className="space-y-5 text-xs sm:text-sm text-[#E8DCD7] font-sans leading-relaxed drop-shadow-sm">
            {paragraphs.map((p, idx) => (
              <p key={idx} className="first-letter:text-lg first-letter:font-editorial first-letter:text-white">
                {p}
              </p>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
