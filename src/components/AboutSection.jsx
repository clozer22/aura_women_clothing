import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ShopTheLook from './ShopTheLook';

export default function AboutSection({
  config,
  products = [],
  onSelectProduct,
  onNavigateFullCatalog,
  devMode = false,
}) {
  const safeConfig = config || {};
  const mediaUrl = safeConfig.aboutMediaUrl || 'https://pcmlleeuxbymomjxhwlv.supabase.co/storage/v1/object/public/storefront/about_media_1788531122753.png';
  const mediaType = safeConfig.aboutMediaType || 'image';
  const isVideoUrl = mediaUrl && (
    mediaType === 'video' ||
    mediaUrl.startsWith('data:video/') ||
    (typeof mediaUrl === 'string' && !!mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i))
  );

  // If the about media is an image, render the interactive ShopTheLook lookbook
  if (!isVideoUrl) {
    return (
      <section id="about" className="w-full bg-white select-none">
        <ShopTheLook
          bannerImage={mediaUrl}
          catalogProducts={products}
          onSelectProduct={onSelectProduct}
          onNavigateFullCatalog={onNavigateFullCatalog}
          devMode={devMode}
        />
      </section>
    );
  }

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

  // Viewport & Tab visibility observer: pause video when scrolled out of view, unmounted, or tab minimized
  useEffect(() => {
    const videoEl = mediaRef.current;
    if (!isVideoUrl || !videoEl) return;

    // Hardened iOS WebKit inline & muted configuration
    videoEl.defaultMuted = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', '');

    let isVisibleInViewport = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleInViewport = entry.isIntersecting;
          if (entry.isIntersecting && document.visibilityState === 'visible') {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(videoEl);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        videoEl.pause();
      } else if (isVisibleInViewport) {
        videoEl.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (videoEl) {
        videoEl.pause();
      }
    };
  }, [isVideoUrl, mediaUrl]);

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
              webkit-playsinline="true"
              controls={false}
              controlsList="nofullscreen nodownload noremoteplayback"
              disablePictureInPicture
              disableRemotePlayback
              onLoadedData={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              className={`h-full w-auto max-w-none sm:absolute sm:inset-0 sm:w-full sm:h-full sm:object-cover sm:object-center transition-opacity duration-700 ease-out ambient-bg pointer-events-none select-none ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <img
              ref={mediaRef}
              src={mediaUrl}
              alt="Aura Atelier Brand Background"
              loading="lazy"
              decoding="async"
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
