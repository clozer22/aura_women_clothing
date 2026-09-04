import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageSkeleton({ label = 'Loading Atelier Experience...' }) {
  return (
    <div className="min-h-screen bg-[#FAF5F2] flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
      <div className="w-16 h-16 border border-[#E8DCD7] bg-white flex items-center justify-center shadow-sm mb-4">
        <Loader2 className="w-6 h-6 text-[#B86B60] animate-spin" />
      </div>
      <div className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#705B56]">
        {label}
      </div>
      <div className="mt-2 w-24 h-0.5 bg-[#E8DCD7] overflow-hidden">
        <div className="w-full h-full bg-[#B86B60] animate-pulse" />
      </div>
    </div>
  );
}
