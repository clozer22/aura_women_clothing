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

  // Letters of the title for staggered animation
  const titleLetters = ["A", "u", "r", "a"];

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

  const textContainerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const letterVariants = {
    initial: { opacity: 0, y: 30, scale: 0.9 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const subtitleVariants = {
    initial: { opacity: 0, letterSpacing: '0.1em' },
    animate: {
      opacity: 0.8,
      letterSpacing: '0.3em',
      transition: {
        duration: 1.2,
        delay: 0.8,
        ease: [0.16, 1, 0.3, 1]
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
        <motion.div
          variants={textContainerVariants}
          className="flex items-center gap-4 sm:gap-6 mb-4"
        >
          {titleLetters.map((letter, idx) => (
            <motion.span
              key={idx}
              variants={letterVariants}
              className="text-[110px] sm:text-[230px] md:text-[350px] font-brand text-[#f3d5e7] tracking-normal select-none leading-none"
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* Animated Subtitle */}
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
