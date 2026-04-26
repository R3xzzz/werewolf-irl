import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Base styles
    let classes = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold tracking-wide ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moon-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale cursor-pointer";
    
    // Variant styles
    if (variant === 'primary') classes += " bg-moon-800 text-white shadow-[0_0_15px_rgba(167,139,250,0.3)] border border-moon-600/50";
    if (variant === 'secondary') classes += " bg-forest-900 text-moon-200 border border-moon-800/50";
    if (variant === 'danger') classes += " bg-wolf-900 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-wolf-600/50";
    if (variant === 'ghost') classes += " hover:bg-forest-900/50 hover:text-moon-200";
    if (variant === 'glass') classes += " glass-panel text-white border border-white/10";

    // Size styles
    if (size === 'default') classes += " h-10 px-5 py-2";
    if (size === 'sm') classes += " h-9 rounded-md px-3 text-xs";
    if (size === 'lg') classes += " h-14 rounded-xl px-8 text-lg font-serif uppercase tracking-widest";
    if (size === 'icon') classes += " h-10 w-10";

    if (asChild) {
      return (
        <Slot
          className={cn(classes, className)}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <motion.button
        className={cn(classes, className)}
        ref={ref}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.02, backgroundColor: variant === 'primary' ? '#5b21b6' : undefined } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
