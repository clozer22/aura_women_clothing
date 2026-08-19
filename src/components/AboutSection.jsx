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

  useEffect(() => {
    setLoaded(false);
  }, [mediaUrl]);

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

  return (
    <section id="about" className="relative min-h-[600px] sm:min-h-[850px] w-full overflow-hidden select-none bg-white">
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
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-out ${
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
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-out ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      ) : null}
    </section>
  );
}
