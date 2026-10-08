import React from "react";
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Star,
  ChefHat,
  Utensils,
} from "lucide-react";

export type BadgeVariant =
  | "certified"
  | "verified"
  | "cuisine"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "haccp"
  | "tasted"
  | "goodconduct";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?:
    | "award"
    | "shield"
    | "sparkles"
    | "star"
    | "check"
    | "chef"
    | "utensils"
    | "none";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Badge({
  children,
  variant = "neutral",
  icon = "none",
  size = "sm",
  className = "",
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    certified:
      "bg-forest-950/90 text-champagne-300 border border-forest-600/40 backdrop-blur-md shadow-sm",
    verified:
      "bg-forest-50 text-forest-800 border border-forest-200/80 shadow-xs",
    cuisine:
      "bg-cream-100 text-forest-900 border border-forest-100/90 hover:border-forest-300 transition-colors",
    gold: "bg-champagne-100 text-champagne-900 border border-champagne-300 shadow-xs",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border border-amber-200",
    danger: "bg-red-50 text-red-800 border border-red-200",
    neutral: "bg-white text-forest-800 border border-forest-100 shadow-xs",
    haccp:
      "bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-950 text-sky-200 border border-sky-400/50 backdrop-blur-md shadow-sm font-black tracking-wide",
    tasted:
      "bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-champagne-300 border border-champagne-400/60 backdrop-blur-md shadow-sm font-bold",
    goodconduct:
      "bg-emerald-950/90 text-emerald-200 border border-emerald-400/40 backdrop-blur-md shadow-sm font-bold",
  };

  const sizeStyles: Record<"sm" | "md" | "lg", string> = {
    sm: "px-2.5 py-0.5 text-[10px] font-bold",
    md: "px-3 py-1 text-xs font-bold",
    lg: "px-3.5 py-1.5 text-xs font-black tracking-wider uppercase",
  };

  const renderIcon = () => {
    const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
    switch (icon) {
      case "award":
        return <Award className={`${iconSize} text-champagne-400 shrink-0`} />;
      case "shield":
        return <ShieldCheck className={`${iconSize} text-sky-400 shrink-0`} />;
      case "sparkles":
        return <Sparkles className={`${iconSize} text-champagne-500 shrink-0`} />;
      case "star":
        return <Star className={`${iconSize} text-amber-500 fill-amber-500 shrink-0`} />;
      case "check":
        return <CheckCircle2 className={`${iconSize} text-emerald-400 shrink-0`} />;
      case "chef":
        return <ChefHat className={`${iconSize} text-champagne-400 shrink-0`} />;
      case "utensils":
        return <Utensils className={`${iconSize} text-champagne-400 shrink-0`} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-sans transition-all select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
}
