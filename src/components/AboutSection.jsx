import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AboutSection({ config }) {
  const safeConfig = config || {};
  const mediaUrl = safeConfig.aboutMediaUrl || null;
  const mediaType = safeConfig.aboutMediaType || 'image';
  const isVideoUrl = mediaUrl && (
    mediaType === 'video' ||
    mediaUrl.startsWith('data:video/') ||
    (typeof mediaUrl === 'string' && !!mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i))
  );

  const [loaded, setLoaded] = useState(false);
  const mediaRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Center scroll position on mobile view once media is loaded
  useEffect(() => {
    const centerScroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollRange = container.scrollWidth - container.clientWidth;
        if (scrollRange > 0) {
          container.scrollLeft = scrollRange / 2;
        }
      }
    };

    if (loaded) {
      centerScroll();
      // Use small timeouts to ensure rendering/styling values are accurate
      const timer1 = setTimeout(centerScroll, 50);
      const timer2 = setTimeout(centerScroll, 150);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [loaded]);

  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollRange = container.scrollWidth - container.clientWidth;
        if (scrollRange > 0) {
          container.scrollLeft = scrollRange / 2;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section id="about" className="relative min-h-[600px] sm:min-h-[850px] w-full overflow-hidden select-none bg-white">
      {/* Shimmer Placeholder while fetching or loading */}
      {(!loaded || !mediaUrl) && (
        <div className="absolute inset-0 skeleton-shimmer z-20" />
      )}

      {/* Scrollable Background Media Wrapper */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 w-full h-full overflow-x-auto overflow-y-hidden scrollbar-none sm:overflow-hidden"
      >
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
              className={`h-full w-auto max-w-none sm:absolute sm:inset-0 sm:w-full sm:h-full sm:object-cover sm:object-center transition-opacity duration-700 ease-out ${
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
              className={`h-full w-auto max-w-none sm:absolute sm:inset-0 sm:w-full sm:h-full sm:object-cover sm:object-center transition-opacity duration-700 ease-out ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        ) : null}
      </div>
    </section>
  );
}
