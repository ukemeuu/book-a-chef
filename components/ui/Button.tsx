import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "gold" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold tracking-tight rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none";

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-forest-900 text-cream-50 hover:bg-forest-800 shadow-md hover:shadow-lg shadow-forest-950/15 border border-forest-800",
    secondary:
      "bg-cream-100 text-forest-900 hover:bg-cream-200 border border-forest-100/90",
    gold:
      "bg-champagne-400 text-forest-950 hover:bg-champagne-300 shadow-md hover:shadow-lg shadow-champagne-500/20 font-black",
    outline:
      "bg-white/80 backdrop-blur-md text-forest-900 hover:bg-cream-50 border border-forest-200/80 shadow-xs",
    ghost:
      "bg-transparent text-forest-800 hover:bg-cream-100/70",
    danger:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3.5 py-2 text-xs gap-1.5",
    md: "px-5 py-3 text-xs uppercase tracking-wider gap-2",
    lg: "px-7 py-4 text-sm uppercase tracking-wider font-black gap-2.5 rounded-[22px]",
    icon: "h-10 w-10 p-0 rounded-full",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
