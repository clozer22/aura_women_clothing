import React, { memo } from 'react';

const StatCard = memo(({
  title,
  value,
  badgeText,
  badgeType = 'default', // 'default' | 'success' | 'warning' | 'alert' | 'info'
  badgeIcon: BadgeIcon,
  sublabel,
  icon: Icon,
  iconBgColor = 'bg-blue-50 text-blue-600',
  className = '',
}) => {
  const badgeStyles = {
    default: 'text-slate-600 bg-slate-100 border-slate-200',
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-800 bg-amber-50 border-amber-200',
    alert: 'text-rose-700 bg-rose-50 border-rose-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300/80 ${className}`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 180px',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block mb-1 truncate">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-sans tracking-tight truncate">
            {value}
          </div>
        </div>

        {Icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBgColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        {badgeText && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${badgeStyles[badgeType] || badgeStyles.default}`}>
            {BadgeIcon && <BadgeIcon className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate">{badgeText}</span>
          </div>
        )}
        {sublabel && (
          <span className="text-[11px] text-slate-400 font-medium ml-auto truncate">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
