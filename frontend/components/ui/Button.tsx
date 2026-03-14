"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "primary" && "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/30",
          variant === "ghost" && "hover:bg-white/5 text-gray-300 hover:text-white",
          variant === "outline" && "border border-white/10 hover:border-white/20 text-gray-300 hover:text-white hover:bg-white/5",
          variant === "danger" && "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30",
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
