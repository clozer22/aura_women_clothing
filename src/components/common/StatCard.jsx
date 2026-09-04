import React, { memo } from 'react';

const StatCard = memo(({
  title,
  value,
  badgeText,
  badgeType = 'default', // 'default' | 'success' | 'warning' | 'alert'
  badgeIcon: BadgeIcon,
  sublabel,
  icon: Icon,
  className = '',
}) => {
  const badgeStyles = {
    default: 'text-[#705B56] border-[#E8DCD7] bg-[#FAF5F2]',
    success: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    warning: 'text-amber-800 border-amber-300 bg-amber-50',
    alert: 'text-red-700 border-red-200 bg-red-50',
  };

  return (
    <div
      className={`bg-white border border-[#E8DCD7] p-6 rounded-none relative overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 200px',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#705B56] uppercase block mb-1">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-light text-[#2C1E1B] font-serif">
            {value}
          </div>
        </div>
        {Icon && (
          <div className="w-9 h-9 bg-[#FAF5F2] border border-[#E8DCD7] flex items-center justify-center text-[#705B56]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#E8DCD7]/60 flex items-center justify-between">
        {badgeText && (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${badgeStyles[badgeType] || badgeStyles.default}`}>
            {BadgeIcon && <BadgeIcon className="w-2.5 h-2.5" />}
            <span>{badgeText}</span>
          </div>
        )}
        {sublabel && (
          <span className="text-[10px] text-[#A38E88] font-medium ml-auto">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
