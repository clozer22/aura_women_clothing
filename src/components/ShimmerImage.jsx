import React, { useState, useEffect, useRef } from 'react';

export default function ShimmerImage({ src, alt, className = '', imgClassName = '', ...props }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // If the image changes, reset loaded state
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer Skeleton Placeholder */}
      {!loaded && (
        <div className="absolute inset-0 skeleton-shimmer z-10" />
      )}
      
      {src ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full transition-opacity duration-700 ease-out ${
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
