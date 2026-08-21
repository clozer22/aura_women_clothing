import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_CONFIG = {
  posterUrl: '',
  title: 'Aura',
};

export default function Hero({ config }) {
  const activeConfig = { ...DEFAULT_CONFIG, ...config };
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const mediaRef = useRef(null);

  // If posterUrl changes, reset loaded state
  useEffect(() => {
    setMediaLoaded(false);
  }, [activeConfig.posterUrl]);

  const isVideo = activeConfig.posterUrl?.startsWith('data:video/') ||
    activeConfig.posterUrl?.match(/\.(mp4|webm|mov|ogg)($|\?)/i);

  // Check if resource is cached and already loaded
  useEffect(() => {
    if (mediaRef.current) {
      if (isVideo) {
        if (mediaRef.current.readyState >= 3) {
          setMediaLoaded(true);
        }
      } else {
        if (mediaRef.current.complete) {
          setMediaLoaded(true);
        }
      }
    }
  }, [activeConfig.posterUrl, isVideo]);

  return (
    <section className="relative pt-[68px] sm:pt-[72px] overflow-hidden bg-[#FAF0EC]">
      {/* Subtle Ambient Radial Glows */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#F0D4CD]/50 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Top Giant Fashion Display Serif Typography - Full Width & Flush with Nav Bar */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-[55vh] sm:h-[70vh] md:h-[80vh] min-h-[400px] sm:min-h-[580px] md:min-h-[700px] overflow-hidden border-b border-[#E8DCD7] select-none group rounded-none"
      >
        {/* Shimmer Skeleton Placeholder while loading */}
        {(!mediaLoaded || !activeConfig.posterUrl) && (
          <div className="absolute inset-0 skeleton-shimmer z-20" />
        )}

        {/* Background Image or Video loop */}
        {activeConfig.posterUrl ? (
          isVideo ? (
            <video
              ref={mediaRef}
              src={activeConfig.posterUrl}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setMediaLoaded(true)}
              onError={() => setMediaLoaded(true)}
              className={`w-full h-full object-cover object-center scale-105 group-hover:scale-100 transition-all duration-[1200ms] ease-out rounded-none ${mediaLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            />
          ) : (
            <img
              ref={mediaRef}
              src={activeConfig.posterUrl}
              alt="Aura Editorial Close-up"
              onLoad={() => setMediaLoaded(true)}
              onError={() => setMediaLoaded(true)}
              className={`w-full h-full object-cover object-[center_28%] scale-105 group-hover:scale-100 transition-all duration-[1200ms] ease-out rounded-none ${mediaLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            />
          )
        ) : null}



        {/* Highlighted Giant White Text */}
        <div className="absolute inset-0 flex items-center justify-center rounded-none z-10">
          <h1
            className="text-[32vw] sm:text-[35vw] md:text-[38vw] lg:text-[40vw] font-brand font-normal text-white select-none tracking-tight leading-none lowercase first-letter:capitalize drop-shadow-xl text-center"
            style={{ textShadow: '0 5px 24px rgba(179, 179, 179, 0.81) ' }}
          >
            {activeConfig.title || 'Aura'}
          </h1>
        </div>
      </motion.div>
    </section>
  );
}
