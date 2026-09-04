import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

const LuxuryButton = memo(({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'outline' | 'dark'
  size = 'md',        // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  loadingText,
  disabled = false,
  className = '',
  type = 'button',
  title,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2C1E1B] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const sizeStyles = {
    sm: 'text-[10px] px-3 py-1.5 gap-1.5',
    md: 'text-xs px-4 py-2.5 gap-2',
    lg: 'text-xs px-6 py-3.5 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#2C1E1B] hover:bg-[#B86B60] text-white shadow-sm',
    dark: 'bg-[#1A1412] hover:bg-[#2C1E1B] text-white shadow-sm',
    secondary: 'bg-[#FAF0EC] hover:bg-[#E8DCD7] text-[#2C1E1B] border border-[#E8DCD7]',
    outline: 'bg-transparent border border-[#E8DCD7] text-[#2C1E1B] hover:bg-[#FAF0EC]',
    danger: 'bg-red-700 hover:bg-red-800 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-[#FAF0EC] text-[#705B56] hover:text-[#2C1E1B]',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        </>
      )}
    </button>
  );
});

LuxuryButton.displayName = 'LuxuryButton';

export default LuxuryButton;
