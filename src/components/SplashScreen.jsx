import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    // Prevent scrolling while splash screen is active
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      onComplete();
    }, 3200); // Complete animation after 3.2 seconds

    return () => {
      document.body.style.overflow = 'unset';
      clearTimeout(timer);
    };
  }, [onComplete]);

  // Unified fade-in animation for the entire brand title
  const textVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.5,
        ease: [0.16, 1, 0.3, 1] // Luxurious smooth ease-out
      }
    }
  };

  const containerVariants = {
    initial: { opacity: 1 },
    exit: {
      y: '-100vh',
      transition: {
        duration: 0.8,
        ease: [0.76, 0, 0.24, 1], // Custom cubic-bezier for smooth slide up
        delay: 0.2
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white select-none text-[#2C1E1B]"
    >
      <div className="flex flex-col items-center justify-center">
        {/* Animated Main Title */}
        <motion.h1
          variants={textVariants}
          className="text-[110px] sm:text-[230px] md:text-[350px] font-brand text-[#f3d5e7] tracking-normal select-none leading-none"
        >
          Aura
        </motion.h1>
      </div>

      {/* Decorative Brand Details */}
      <div className="absolute bottom-10 left-10 text-[9px] uppercase tracking-[0.2em] font-semibold text-[#f3d5e7]/50">
        © 2026 Aura Women's Clothing
      </div>
      <div className="absolute bottom-10 right-10 text-[9px] uppercase tracking-[0.2em] font-semibold text-[#f3d5e7]/50">
        All Rights Reserved
      </div>
    </motion.div>
  );
}
