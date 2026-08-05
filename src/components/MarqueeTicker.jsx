import React from 'react';

export default function MarqueeTicker() {
  // Array of elements that alternates between standard fashion display serif and elegant script cursive
  const items = Array(24).fill(null).map((_, idx) => ({
    text: 'Aura',
    isScript: idx % 2 === 1
  }));

  return (
    <div className="w-full bg-white py-3.5 border-y border-[#E8DCD7] overflow-hidden select-none">
      <div className="animate-marquee flex items-center whitespace-nowrap gap-12">
        {/* Double repeated array for seamless infinite marquee loop */}
        {[...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center gap-12 font-medium">
            <span className={
              item.isScript
                ? "font-script text-[4.5rem] leading-none text-[#A25F55] lowercase tracking-wide -mt-3 block pr-2"
                : "font-brand text-sm sm:text-base text-[#A25F55] tracking-widest lowercase first-letter:capitalize"
            }>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
