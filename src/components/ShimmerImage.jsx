import React, { useState, useEffect, useRef } from 'react';

// Global memory cache of successfully loaded image URLs
const LOADED_IMAGE_CACHE = new Set();

export default function ShimmerImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  ...props
}) {
  const isAlreadyLoaded = !!src && LOADED_IMAGE_CACHE.has(src);
  const [loaded, setLoaded] = useState(isAlreadyLoaded);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      return;
    }

    if (LOADED_IMAGE_CACHE.has(src)) {
      setLoaded(true);
      return;
    }

    setLoaded(false);

    // If browser already completed loading
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      LOADED_IMAGE_CACHE.add(src);
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = () => {
    if (src) LOADED_IMAGE_CACHE.add(src);
    setLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer Skeleton Placeholder - always shown until the image is completely loaded */}
      {!loaded && (
        <div className="absolute inset-0 skeleton-shimmer z-10 pointer-events-none" />
      )}

      {src ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          className={`w-full h-full transition-opacity duration-500 ease-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          {...props}
        />
      ) : (
        <div className="absolute inset-0 bg-[#FAF0EC]" />
      )}
    </div>
  );
}
