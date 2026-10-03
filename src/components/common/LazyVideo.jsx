import React, { memo, useEffect, useRef, useState } from 'react';

/**
 * LazyVideo — the <video> equivalent of loading="lazy".
 *
 * - Does not attach `src` (so nothing downloads) until the element is within
 *   `rootMargin` of the viewport.
 * - Plays only while visible and the tab is active; pauses otherwise to save
 *   CPU, battery and bandwidth on mobile.
 */
function LazyVideo({
  src,
  className = '',
  rootMargin = '200px',
  onLoadedData,
  onError,
  ...props
}) {
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    // Browsers without IntersectionObserver: just load immediately
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          if (document.visibilityState === 'visible') {
            el.play().catch(() => {});
          }
        } else {
          el.pause();
        }
      },
      { rootMargin }
    );
    observer.observe(el);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') el.pause();
      else if (isVisible) el.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      el.pause();
    };
  }, [src, rootMargin]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      preload={shouldLoad ? 'auto' : 'none'}
      autoPlay={shouldLoad}
      loop
      muted
      playsInline
      onLoadedData={onLoadedData}
      onError={onError}
      className={className}
      {...props}
    />
  );
}

export default memo(LazyVideo);
